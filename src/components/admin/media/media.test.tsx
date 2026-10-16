import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createMediaUploadAction: vi.fn(async () => ({
    ok: true,
    data: { path: "2026/10/uuid-team.jpg", token: "tok" },
  })),
  registerMediaAction: vi.fn(async () => ({
    ok: true,
    data: { id: "m1", url: "https://cdn/team.jpg", altText: "Team" },
  })),
  listMediaAction: vi.fn(async () => ({
    ok: true,
    data: [
      {
        id: "m9",
        kind: "IMAGE",
        url: "https://cdn/old.webp",
        filename: "old.webp",
        size: 2048,
        altText: "Old photo",
      },
    ],
  })),
  deleteMediaAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/admin/(dashboard)/content/media-actions", () => actions);
const uploadToSignedUrl = vi.hoisted(() =>
  vi.fn(async () => ({ data: {}, error: null })),
);
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }),
}));
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// A fake image decoder: every image is `width` pixels wide.
let width = 1200;
beforeEach(() => {
  vi.clearAllMocks();
  width = 1200;
  vi.stubGlobal("createImageBitmap", async () => ({
    width,
    height: width / 2,
    close() {},
  }));
  HTMLCanvasElement.prototype.getContext = (() => ({
    drawImage() {},
  })) as never;
  HTMLCanvasElement.prototype.toBlob = function (cb) {
    cb(new Blob(["x".repeat(100)], { type: "image/webp" }));
  };
});

const { uploadMedia, prepareImage } = await import("./upload-media");
const { MediaPicker } = await import("./media-picker");

const image = (name = "Team.jpg", type = "image/jpeg", size = 1000) =>
  new File(["x".repeat(size)], name, { type });

describe("uploadMedia", () => {
  it("asks for a signed URL, uploads straight to Storage, then records it", async () => {
    const steps: string[] = [];
    const result = await uploadMedia("IMAGE", image(), "Team", (s) =>
      steps.push(s),
    );
    expect(steps).toEqual(["resizing", "uploading", "saving"]);
    expect(actions.createMediaUploadAction).toHaveBeenCalledWith({
      kind: "IMAGE",
      filename: "Team.jpg",
      mimeType: "image/jpeg",
      size: 1000,
    });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      "2026/10/uuid-team.jpg",
      "tok",
      expect.any(File),
      { contentType: "image/jpeg" },
    );
    expect(actions.registerMediaAction).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "IMAGE",
        altText: "Team",
        width: 1200,
        height: 600,
      }),
    );
    expect(result.url).toBe("https://cdn/team.jpg");
  });

  it("checks the type and alt text before asking for a URL", async () => {
    await expect(
      uploadMedia("IMAGE", image("a.gif", "image/gif"), "Alt"),
    ).rejects.toThrow(/supported image/);
    await expect(uploadMedia("IMAGE", image(), "  ")).rejects.toThrow(
      /Describe the image/,
    );
    await expect(
      uploadMedia(
        "VIDEO",
        new File(["x"], "talk.mp4", { type: "video/mp4" }),
        "",
      ),
    ).resolves.toBeDefined();
    expect(actions.createMediaUploadAction).toHaveBeenCalledTimes(1);
  });

  it("stops if the upload itself fails", async () => {
    uploadToSignedUrl.mockResolvedValueOnce({
      data: null,
      error: new Error("network"),
    } as never);
    await expect(uploadMedia("IMAGE", image(), "Team")).rejects.toThrow(
      /upload failed/,
    );
    expect(actions.registerMediaAction).not.toHaveBeenCalled();
  });
});

describe("prepareImage", () => {
  it("leaves images up to 2000px alone", async () => {
    const file = image();
    expect((await prepareImage(file)).file).toBe(file);
  });

  it("resizes wider images to 2000px WebP", async () => {
    width = 4000;
    const result = await prepareImage(image("Big Photo.jpg"));
    expect(result).toMatchObject({ width: 2000, height: 1000 });
    expect(result.file.type).toBe("image/webp");
    expect(result.file.name).toBe("Big Photo.webp");
  });
});

describe("MediaPicker", () => {
  it("picks from the library, passing on its alt text", async () => {
    const onChange = vi.fn();
    render(
      <MediaPicker
        kind="IMAGE"
        label="Image"
        value={undefined}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose image…" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: "Library" }));
    });
    const dialog = screen.getByRole("dialog", { name: "Choose image" });
    fireEvent.click(
      await within(dialog).findByRole("button", { name: /Use old\.webp/ }),
    );
    expect(actions.listMediaAction).toHaveBeenCalledWith("IMAGE");
    expect(onChange).toHaveBeenCalledWith("https://cdn/old.webp", "Old photo");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("won't upload an image without alt text", async () => {
    render(
      <MediaPicker
        kind="IMAGE"
        label="Image"
        value={undefined}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose image…" }));
    fireEvent.change(screen.getByLabelText("Choose a file"), {
      target: { files: [image()] },
    });
    const upload = screen.getByRole("button", { name: "Upload" });
    expect(upload).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Alt text"), {
      target: { value: "The team" },
    });
    expect(upload).toBeEnabled();
  });

  it("accepts a pasted URL too", () => {
    const onChange = vi.fn();
    render(
      <MediaPicker kind="VIDEO" label="Video" value="" onChange={onChange} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Video URL" }), {
      target: { value: " https://example.org/v.mp4 " },
    });
    expect(onChange).toHaveBeenCalledWith("https://example.org/v.mp4");
  });
});
