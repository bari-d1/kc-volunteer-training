import { describe, expect, it } from "vitest";
import { safeFilename, storagePath, uploadProblem } from "./media-upload";

const MB = 1024 * 1024;

describe("uploadProblem", () => {
  it("accepts the allowed types within their limits", () => {
    expect(
      uploadProblem("IMAGE", {
        name: "a.JPG",
        type: "image/jpeg",
        size: 4 * MB,
      }),
    ).toBeNull();
    expect(
      uploadProblem("IMAGE", { name: "a.webp", type: "image/webp", size: 1 }),
    ).toBeNull();
    expect(
      uploadProblem("VIDEO", {
        name: "talk.mp4",
        type: "video/mp4",
        size: 199 * MB,
      }),
    ).toBeNull();
    expect(
      uploadProblem("CAPTIONS", { name: "talk.vtt", type: "", size: 2000 }),
    ).toBeNull();
  });

  it("rejects other types, with a helpful message", () => {
    expect(
      uploadProblem("IMAGE", { name: "a.gif", type: "image/gif", size: 1 }),
    ).toBe("That isn't a supported image. Use .jpg, .png, .webp.");
    expect(
      uploadProblem("VIDEO", {
        name: "a.mov",
        type: "video/quicktime",
        size: 1,
      }),
    ).toMatch(/\.mp4/);
    // A renamed file still has to have the right type.
    expect(
      uploadProblem("IMAGE", {
        name: "a.png",
        type: "application/pdf",
        size: 1,
      }),
    ).not.toBeNull();
  });

  it("rejects files over the limit", () => {
    expect(
      uploadProblem("IMAGE", {
        name: "a.png",
        type: "image/png",
        size: 6 * MB,
      }),
    ).toBe("That image is 6 MB. The limit is 5 MB.");
    expect(
      uploadProblem("VIDEO", {
        name: "a.mp4",
        type: "video/mp4",
        size: 201 * MB,
      }),
    ).toMatch(/200 MB/);
    expect(
      uploadProblem("CAPTIONS", {
        name: "a.vtt",
        type: "text/vtt",
        size: 2 * MB,
      }),
    ).toMatch(/1 MB/);
    expect(
      uploadProblem("IMAGE", { name: "a.png", type: "image/png", size: 0 }),
    ).toBe("That file is empty.");
  });
});

describe("storage paths", () => {
  it("makes filenames URL-safe", () => {
    expect(safeFilename("Our Team (1).JPG")).toBe("our-team-1.jpg");
    expect(safeFilename("Café Sunday!.png")).toBe("cafe-sunday.png");
    expect(safeFilename("!!!.mp4")).toBe("file.mp4");
  });

  it("files by year and month with an unguessable prefix", () => {
    expect(
      storagePath(
        "Team.jpg",
        "0b7e4c4e-3f2a-4f7e-9a1d-2c3b4d5e6f70",
        new Date("2026-03-05T10:00:00Z"),
      ),
    ).toBe("2026/03/0b7e4c4e-3f2a-4f7e-9a1d-2c3b4d5e6f70-team.jpg");
  });
});
