// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));

const bucket = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(async (path: string) => ({
    data: { path, token: "tok", signedUrl: "https://x" },
    error: null,
  })),
  exists: vi.fn(async () => ({ data: true, error: null })),
  getPublicUrl: vi.fn((path: string) => ({
    data: { publicUrl: `https://cdn.example/course-media/${path}` },
  })),
  remove: vi.fn(async () => ({ data: [], error: null })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => bucket } }),
}));

const changes: unknown[] = [];
const prisma = vi.hoisted(() => ({
  media: {
    create: vi.fn(async ({ data }) => ({ id: "m1", ...data })),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  leader: { count: vi.fn(async () => 0) },
  $queryRaw: vi.fn(async () => [{ count: BigInt(0) }]),
  contentChange: { create: vi.fn(async ({ data }) => changes.push(data)) },
  $transaction: vi.fn(),
}));
prisma.$transaction.mockImplementation(
  async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
);
vi.mock("@/lib/prisma", () => ({ prisma }));

const media = await import("./media");
const PATH = "2026/10/0b7e4c4e-3f2a-4f7e-9a1d-2c3b4d5e6f70-team.webp";

beforeEach(() => {
  vi.clearAllMocks();
  changes.length = 0;
});

describe("createMediaUpload", () => {
  it("checks the file, then signs an upload to a dated, unguessable path", async () => {
    const result = await media.createMediaUpload({
      kind: "IMAGE",
      filename: "Team Photo.jpg",
      mimeType: "image/jpeg",
      size: 1000,
    });
    expect(result.token).toBe("tok");
    expect(result.path).toMatch(
      /^\d{4}\/\d{2}\/[0-9a-f-]{36}-team-photo\.jpg$/,
    );
  });

  it("refuses unsupported or oversized files without asking Storage", async () => {
    await expect(
      media.createMediaUpload({
        kind: "VIDEO",
        filename: "a.mov",
        mimeType: "video/quicktime",
        size: 10,
      }),
    ).rejects.toThrow(/supported video/);
    await expect(
      media.createMediaUpload({
        kind: "IMAGE",
        filename: "a.png",
        mimeType: "image/png",
        size: 9e6,
      }),
    ).rejects.toThrow(/limit is 5 MB/);
    expect(bucket.createSignedUploadUrl).not.toHaveBeenCalled();
  });
});

describe("registerMedia", () => {
  const upload = {
    kind: "IMAGE",
    path: PATH,
    filename: "Team.jpg",
    mimeType: "image/webp",
    size: 1234,
    altText: "Volunteers at the welcome desk",
    width: 2000,
    height: 1333,
  };

  it("records the upload with its public URL and logs it", async () => {
    const row = await media.registerMedia(upload);
    expect(row.url).toBe(`https://cdn.example/course-media/${PATH}`);
    expect(prisma.media.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        path: PATH,
        altText: "Volunteers at the welcome desk",
      }),
    });
    expect(changes).toEqual([
      expect.objectContaining({ entity: "Media", action: "create" }),
    ]);
  });

  it("requires alt text for images", async () => {
    await expect(
      media.registerMedia({ ...upload, altText: " " }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ["altText"] })],
    });
  });

  it("refuses a file that never arrived, or a path it didn't issue", async () => {
    bucket.exists.mockResolvedValueOnce({ data: false, error: null });
    await expect(media.registerMedia(upload)).rejects.toThrow(/didn't finish/);
    await expect(
      media.registerMedia({ ...upload, path: "../secrets.txt" }),
    ).rejects.toThrow();
    expect(prisma.media.create).not.toHaveBeenCalled();
  });
});

describe("deleteMedia", () => {
  beforeEach(() => {
    prisma.media.findUnique.mockResolvedValue({
      id: "m1",
      url: "https://cdn.example/x.webp",
      path: PATH,
      kind: "IMAGE",
      filename: "x.webp",
    });
  });

  it("refuses while a block or leader uses the file", async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(2) }]);
    prisma.leader.count.mockResolvedValueOnce(1);
    expect(await media.deleteMedia("m1")).toEqual({
      deleted: false,
      reason: "It's used in 3 places. Remove it from those first.",
    });
    expect(bucket.remove).not.toHaveBeenCalled();
    expect(prisma.media.delete).not.toHaveBeenCalled();
  });

  it("removes an unused file from Storage and the library", async () => {
    expect(await media.deleteMedia("m1")).toEqual({ deleted: true });
    expect(bucket.remove).toHaveBeenCalledWith([PATH]);
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(changes).toEqual([expect.objectContaining({ action: "delete" })]);
  });
});
