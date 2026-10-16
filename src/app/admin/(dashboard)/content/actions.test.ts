// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn(async () => {}) }));
const server = vi.hoisted(() => ({
  createModule: vi.fn(),
  updateModule: vi.fn(),
  deleteModule: vi.fn(),
  reorderModules: vi.fn(),
  setModulePublished: vi.fn(),
  createCourse: vi.fn(),
}));
vi.mock("@/server/admin/modules", () => server);
vi.mock("@/server/admin/courses", () => ({
  createCourse: server.createCourse,
}));

const actions = await import("./actions");
const { Prisma } = await import("@/generated/prisma/client");
const COURSE = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("content actions", () => {
  it("creates a module and returns its id", async () => {
    server.createModule.mockResolvedValue({ id: "new-id" });
    expect(
      await actions.createModuleAction(COURSE, {
        title: "Giving",
        slug: "giving",
      }),
    ).toEqual({ ok: true, data: "new-id" });
  });

  it("explains a slug already in use on the slug field", async () => {
    server.createModule.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    expect(await actions.createModuleAction(COURSE, {})).toEqual({
      ok: false,
      error: "Another module in this course already uses this slug.",
      fieldErrors: {
        slug: "Another module in this course already uses this slug.",
      },
    });
  });

  it("returns field errors from validation", async () => {
    const { ModuleInputSchema } = await import("@/server/admin/inputs");
    server.updateModule.mockImplementation(async (_id, input) =>
      ModuleInputSchema.parse(input),
    );
    const result = await actions.updateModuleAction(COURSE, {
      title: "",
      slug: "Not A Slug",
      summary: "",
    });
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        title: expect.any(String),
        slug: "Use lowercase letters, numbers and dashes",
      },
    });
  });

  it("passes on why a module can't be deleted", async () => {
    server.deleteModule.mockResolvedValue({
      deleted: false,
      reason:
        "2 volunteers have progress on this module. Unpublish it instead.",
    });
    expect(await actions.deleteModuleAction(COURSE)).toEqual({
      ok: false,
      error: "2 volunteers have progress on this module. Unpublish it instead.",
    });
  });

  it("rejects a malformed id without touching the database", async () => {
    expect(await actions.deleteModuleAction("nope")).toMatchObject({
      ok: false,
    });
    expect(server.deleteModule).not.toHaveBeenCalled();
  });
});
