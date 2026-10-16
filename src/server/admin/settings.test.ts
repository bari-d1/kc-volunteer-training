// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));

const rows = new Map<string, unknown>();
const logged: unknown[] = [];
const prisma = vi.hoisted(() => ({
  siteSetting: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  course: { findUnique: vi.fn(async () => ({ id: "c1" })) },
  quizQuestion: { count: vi.fn(), groupBy: vi.fn() },
  contentChange: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const settings = await import("./settings");

beforeEach(() => {
  vi.clearAllMocks();
  rows.clear();
  logged.length = 0;
  prisma.siteSetting.findUnique.mockImplementation(async ({ where }) =>
    rows.has(where.key)
      ? { id: where.key, key: where.key, value: rows.get(where.key) }
      : null,
  );
  prisma.siteSetting.upsert.mockImplementation(async ({ where, create }) => {
    rows.set(where.key, create.value);
    return { id: where.key };
  });
  prisma.contentChange.create.mockImplementation(async ({ data }) =>
    logged.push(data),
  );
  prisma.$transaction.mockImplementation(
    async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
  );
  // Bank: 30 ungrouped + 10 groups = 40 draw units, 1 required.
  prisma.quizQuestion.count.mockImplementation(async ({ where }) =>
    where.isRequired ? 1 : 30,
  );
  prisma.quizQuestion.groupBy.mockResolvedValue(
    Array.from({ length: 10 }, (_, i) => ({ group: `g${i}` })),
  );
});

describe("quiz settings", () => {
  it("counts draw units from the active bank", async () => {
    expect(await settings.getQuizBankStatus()).toEqual({
      drawUnits: 40,
      required: 1,
    });
  });

  it("saves a number the bank can fill", async () => {
    await settings.saveQuizSettings({ passMark: 80, questionsPerAttempt: 12 });
    expect(rows.get("quiz")).toEqual({ passMark: 80, questionsPerAttempt: 12 });
    expect(logged).toEqual([
      expect.objectContaining({ summary: "Updated quiz settings" }),
    ]);
  });

  it("refuses more questions than the bank has, or a pass mark over 100", async () => {
    await expect(
      settings.saveQuizSettings({ passMark: 80, questionsPerAttempt: 41 }),
    ).rejects.toMatchObject({
      fieldErrors: {
        questionsPerAttempt: expect.stringMatching(/only has 40/),
      },
    });
    await expect(
      settings.saveQuizSettings({ passMark: 101, questionsPerAttempt: 10 }),
    ).rejects.toThrow();
    expect(rows.has("quiz")).toBe(false);
  });
});

describe("safeguarding and links", () => {
  it("saves contacts with the incident form, keeping the WhatsApp link", async () => {
    rows.set("links", {
      incidentFormUrl: "https://old.example/form",
      whatsappUrl: "https://chat.whatsapp.com/abc",
    });
    await settings.saveSafeguardingSettings({
      email: "safeguarding@kc.example",
      contacts: [{ label: "DSL", name: "Yemi", phone: "07582 847316" }],
      incidentFormUrl: "https://forms.example/new",
    });
    expect(rows.get("safeguarding")).toEqual({
      email: "safeguarding@kc.example",
      contacts: [{ label: "DSL", name: "Yemi", phone: "07582 847316" }],
    });
    expect(rows.get("links")).toEqual({
      incidentFormUrl: "https://forms.example/new",
      whatsappUrl: "https://chat.whatsapp.com/abc",
    });
  });

  it("sets and removes the WhatsApp link", async () => {
    rows.set("links", { incidentFormUrl: "https://forms.example/x" });
    await settings.saveWhatsappLink({
      whatsappUrl: "https://chat.whatsapp.com/abc",
    });
    expect(rows.get("links")).toMatchObject({
      whatsappUrl: "https://chat.whatsapp.com/abc",
    });
    await settings.saveWhatsappLink({});
    expect(rows.get("links")).toEqual({
      incidentFormUrl: "https://forms.example/x",
    });
  });

  it("rejects a non-https link", async () => {
    rows.set("links", { incidentFormUrl: "https://forms.example/x" });
    await expect(
      settings.saveWhatsappLink({ whatsappUrl: "javascript:alert(1)" }),
    ).rejects.toThrow();
  });
});

describe("emails and admin sessions", () => {
  it("validates digest recipients", async () => {
    await settings.saveEmailSettings({
      remindersEnabled: false,
      digestRecipients: ["lead@kc.example"],
    });
    expect(rows.get("emails")).toEqual({
      remindersEnabled: false,
      digestRecipients: ["lead@kc.example"],
    });
    await expect(
      settings.saveEmailSettings({
        remindersEnabled: true,
        digestRecipients: ["not an email"],
      }),
    ).rejects.toThrow();
  });
});
