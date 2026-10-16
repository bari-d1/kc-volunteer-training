// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));

type Row = {
  id: string;
  moduleId: string;
  type: string;
  order: number;
  content: unknown;
  isPublished: boolean;
  draftContent: unknown;
  draftDeleted: boolean;
  draftOrder: number | null;
};

// A tiny in-memory Block table, enough for the editor's queries.
const db = vi.hoisted(() => ({
  blocks: [] as Row[],
  changes: [] as unknown[],
}));
const { Prisma } = await import("@/generated/prisma/client");
const unNull = (v: unknown) => (v === Prisma.DbNull ? null : v);

const blockApi = {
  findMany: async ({ where }: { where: { moduleId: string } }) =>
    db.blocks
      .filter((b) => b.moduleId === where.moduleId)
      .map((b) => ({ ...b })),
  findUnique: async ({ where }: { where: { id: string } }) => {
    const b = db.blocks.find((x) => x.id === where.id);
    return b ? { ...b } : null;
  },
  create: async ({ data }: { data: Partial<Row> }) => {
    const row = {
      id: `00000000-0000-4000-8000-${String(900 + db.blocks.length).padStart(12, "0")}`,
      draftDeleted: false,
      draftOrder: null,
      ...data,
    } as Row;
    db.blocks.push(row);
    return { id: row.id };
  },
  update: async ({
    where,
    data,
  }: {
    where: { id: string };
    data: Partial<Row>;
  }) => {
    const b = db.blocks.find((x) => x.id === where.id)!;
    Object.assign(
      b,
      Object.fromEntries(Object.entries(data).map(([k, v]) => [k, unNull(v)])),
    );
    return b;
  },
  updateMany: async ({
    where,
    data,
  }: {
    where: { moduleId: string };
    data: Partial<Row>;
  }) => {
    for (const b of db.blocks.filter((x) => x.moduleId === where.moduleId))
      Object.assign(
        b,
        Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, unNull(v)]),
        ),
      );
    return { count: 0 };
  },
  delete: async ({ where }: { where: { id: string } }) => {
    db.blocks = db.blocks.filter((b) => b.id !== where.id);
  },
  deleteMany: async ({
    where,
  }: {
    where: { moduleId: string; isPublished: boolean };
  }) => {
    db.blocks = db.blocks.filter(
      (b) =>
        !(b.moduleId === where.moduleId && b.isPublished === where.isPublished),
    );
  },
  count: async ({ where }: { where: { id: { in: string[] } } }) =>
    db.blocks.filter((b) => where.id.in.includes(b.id) && !b.draftDeleted)
      .length,
};
const tx = {
  block: blockApi,
  module: { findUniqueOrThrow: async () => ({ title: "Our Values" }) },
  contentChange: {
    create: async ({ data }: { data: unknown }) => {
      db.changes.push(data);
    },
  },
};
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...tx,
    module: {
      ...tx.module,
      findFirst: async () => ({
        id: "mod",
        slug: "our-values",
        title: "Our Values",
        summary: "",
        narratorIntro: null,
        isPublished: true,
        course: { id: "c", slug: "kc", title: "KC" },
      }),
    },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));

const blocks = await import("./blocks");
const B1 = "00000000-0000-4000-8000-0000000000b1";
// The third block created gets this id from the fake table.
const NEW2 = "00000000-0000-4000-8000-000000000902";

const heading = (id: string, order: number, text: string): Row => ({
  id,
  moduleId: "mod",
  type: "HEADING",
  order,
  content: { text, level: 2 },
  isPublished: true,
  draftContent: null,
  draftDeleted: false,
  draftOrder: null,
});

beforeEach(() => {
  db.blocks = [
    heading("00000000-0000-4000-8000-0000000000b1", 0, "One"),
    heading("00000000-0000-4000-8000-0000000000b2", 1, "Two"),
  ];
  db.changes = [];
});

describe("drafts", () => {
  it("saves edits to the draft, never the published content", async () => {
    await blocks.saveBlockDraft("00000000-0000-4000-8000-0000000000b1", {
      text: "  One, edited  ",
      level: 2,
    });
    expect(db.blocks[0]).toMatchObject({
      content: { text: "One", level: 2 },
      draftContent: { text: "One, edited", level: 2 },
    });
  });

  it("refuses invalid content with field errors, writing nothing", async () => {
    await expect(
      blocks.saveBlockDraft("00000000-0000-4000-8000-0000000000b1", {
        text: "",
        level: 7,
      }),
    ).rejects.toMatchObject({
      fieldErrors: { text: expect.any(String), level: expect.any(String) },
    });
    expect(db.blocks[0].draftContent).toBeNull();
  });

  it("adds new blocks unpublished with valid starter content", async () => {
    await blocks.createBlock("mod", "FLIP_CARDS");
    expect(db.blocks.at(-1)).toMatchObject({
      type: "FLIP_CARDS",
      isPublished: false,
      order: 2,
      content: { cards: [{ front: "Front", back: "Back" }] },
    });
  });

  it("marks published blocks for deletion but removes new ones outright", async () => {
    await blocks.deleteBlock("00000000-0000-4000-8000-0000000000b1");
    expect(
      db.blocks.find((b) => b.id === "00000000-0000-4000-8000-0000000000b1")
        ?.draftDeleted,
    ).toBe(true);
    const id = await blocks.createBlock("mod", "TEXT");
    await blocks.deleteBlock(id);
    expect(db.blocks.some((b) => b.id === id)).toBe(false);
  });

  it("reorders in the draft only", async () => {
    await blocks.reorderBlocks(
      "mod",
      [
        "00000000-0000-4000-8000-0000000000b2",
        "00000000-0000-4000-8000-0000000000b1",
      ].map((x) => x),
    );
    expect(db.blocks.map((b) => [b.id, b.order, b.draftOrder])).toEqual([
      ["00000000-0000-4000-8000-0000000000b1", 0, 1],
      ["00000000-0000-4000-8000-0000000000b2", 1, 0],
    ]);
  });
});

describe("editor and preview", () => {
  it("show draft content in draft order, without deleted blocks", async () => {
    await blocks.saveBlockDraft("00000000-0000-4000-8000-0000000000b2", {
      text: "Two, edited",
      level: 2,
    });
    db.blocks[0].draftDeleted = true;
    db.blocks.push({
      ...heading("00000000-0000-4000-8000-0000000000b3", 2, "Three"),
      draftOrder: 0,
      isPublished: false,
    });
    const editor = await blocks.getModuleEditor("kc", "our-values");
    expect(
      editor?.blocks.map((b) => [
        b.id,
        (b.content as { text: string }).text,
        b.isNew,
        b.changed,
      ]),
    ).toEqual([
      ["00000000-0000-4000-8000-0000000000b3", "Three", true, false],
      ["00000000-0000-4000-8000-0000000000b2", "Two, edited", false, true],
    ]);
    expect(editor?.deletedCount).toBe(1);
    expect(editor?.hasUnpublishedChanges).toBe(true);

    const preview = await blocks.getModulePreview("kc", "our-values");
    expect(preview?.blocks.map((b) => b.id)).toEqual([
      "00000000-0000-4000-8000-0000000000b3",
      "00000000-0000-4000-8000-0000000000b2",
    ]);
  });

  it("report no changes when everything is published", async () => {
    expect(
      (await blocks.getModuleEditor("kc", "our-values"))?.hasUnpublishedChanges,
    ).toBe(false);
  });
});

describe("publish and discard", () => {
  beforeEach(async () => {
    await blocks.saveBlockDraft("00000000-0000-4000-8000-0000000000b1", {
      text: "One, edited",
      level: 2,
    });
    await blocks.deleteBlock("00000000-0000-4000-8000-0000000000b2");
    await blocks.createBlock("mod", "TEXT");
    await blocks.reorderBlocks("mod", [NEW2, B1]);
    db.changes = [];
  });

  it("publishes everything at once and logs one change", async () => {
    expect(await blocks.publishModuleChanges("mod")).toBe(3);
    expect(
      db.blocks.map((b) => [
        b.id,
        b.order,
        b.isPublished,
        b.content,
        b.draftContent,
        b.draftOrder,
      ]),
    ).toEqual([
      [
        "00000000-0000-4000-8000-0000000000b1",
        1,
        true,
        { text: "One, edited", level: 2 },
        null,
        null,
      ],
      [NEW2, 0, true, { markdown: "Write something here." }, null, null],
    ]);
    expect(db.changes).toEqual([
      expect.objectContaining({
        entityId: "mod",
        action: "publish",
        summary: "Published changes to “Our Values” (3 blocks)",
      }),
    ]);
  });

  it("discards back to exactly what volunteers see", async () => {
    await blocks.discardModuleChanges("mod");
    expect(
      db.blocks.map((b) => [
        b.id,
        b.order,
        b.content,
        b.draftContent,
        b.draftDeleted,
        b.draftOrder,
      ]),
    ).toEqual([
      [
        "00000000-0000-4000-8000-0000000000b1",
        0,
        { text: "One", level: 2 },
        null,
        false,
        null,
      ],
      [
        "00000000-0000-4000-8000-0000000000b2",
        1,
        { text: "Two", level: 2 },
        null,
        false,
        null,
      ],
    ]);
    expect(db.changes).toHaveLength(1);
  });
});
