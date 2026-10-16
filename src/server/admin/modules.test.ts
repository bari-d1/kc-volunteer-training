// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));

const tx = vi.hoisted(() => ({
  module: {
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  moduleProgress: { count: vi.fn() },
  contentChange: {
    create: vi.fn<(a: { data: Record<string, unknown> }) => Promise<object>>(
      async () => ({}),
    ),
  },
}));
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  module: { findMany: vi.fn() },
  block: { groupBy: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const m = await import("./modules");
const ID = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const logged = () => tx.contentChange.create.mock.calls.map((c) => c[0].data);

beforeEach(() => vi.clearAllMocks());

describe("listModules", () => {
  it("adds block, draft and progress counts", async () => {
    prisma.module.findMany.mockResolvedValue([
      { id: "m1", title: "Welcome", _count: { blocks: 4, progress: 3 } },
      { id: "m2", title: "About", _count: { blocks: 2, progress: 0 } },
    ]);
    prisma.block.groupBy.mockResolvedValue([
      { moduleId: "m2", _count: { _all: 1 } },
    ]);
    expect(await m.listModules(COURSE)).toEqual([
      {
        id: "m1",
        title: "Welcome",
        blockCount: 4,
        draftBlockCount: 0,
        progressCount: 3,
      },
      {
        id: "m2",
        title: "About",
        blockCount: 2,
        draftBlockCount: 1,
        progressCount: 0,
      },
    ]);
  });
});

describe("setModulePublished", () => {
  it("logs publish and unpublish as their own actions", async () => {
    tx.module.update.mockResolvedValue({ id: ID, title: "Giving" });
    await m.setModulePublished(ID, true);
    await m.setModulePublished(ID, false);
    expect(tx.module.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { isPublished: true },
    });
    expect(logged()).toEqual([
      {
        entity: "Module",
        entityId: ID,
        action: "publish",
        summary: "Published module “Giving”",
      },
      {
        entity: "Module",
        entityId: ID,
        action: "unpublish",
        summary: "Unpublished module “Giving”",
      },
    ]);
  });
});

describe("deleteModule", () => {
  it("deletes a module nobody has started, and logs it", async () => {
    tx.moduleProgress.count.mockResolvedValue(0);
    tx.module.delete.mockResolvedValue({ id: ID, title: "Draft" });
    expect(await m.deleteModule(ID)).toEqual({ deleted: true });
    expect(logged()[0]).toMatchObject({
      action: "delete",
      summary: "Deleted module “Draft”",
    });
  });

  it("refuses when volunteers have progress, suggesting unpublishing", async () => {
    tx.moduleProgress.count.mockResolvedValue(3);
    expect(await m.deleteModule(ID)).toEqual({
      deleted: false,
      reason:
        "3 volunteers have progress on this module. Unpublish it instead.",
    });
    expect(tx.module.delete).not.toHaveBeenCalled();
    expect(logged()).toEqual([]);
  });
});

describe("reorderModules", () => {
  it("sets each module's order to its position and logs once", async () => {
    tx.module.count.mockResolvedValue(2);
    await m.reorderModules(COURSE, [ID, COURSE]);
    expect(tx.module.update.mock.calls.map((c) => c[0])).toEqual([
      { where: { id: ID }, data: { order: 0 } },
      { where: { id: COURSE }, data: { order: 1 } },
    ]);
    expect(logged()).toEqual([
      {
        entity: "Course",
        entityId: COURSE,
        action: "reorder",
        summary: "Reordered modules",
      },
    ]);
  });

  it("rejects modules from another course", async () => {
    tx.module.count.mockResolvedValue(1);
    await expect(m.reorderModules(COURSE, [ID, COURSE])).rejects.toThrow(
      "Every module must belong to this course",
    );
  });
});
