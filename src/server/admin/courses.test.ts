// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));

const db = vi.hoisted(() => ({
  course: { findUnique: vi.fn(), delete: vi.fn() },
  contentChange: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...db,
    $transaction: async (fn: (t: typeof db) => unknown) => fn(db),
  },
}));

const { deleteCourse } = await import("./courses");
const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => vi.clearAllMocks());

describe("deleteCourse", () => {
  it("deletes another course and logs it", async () => {
    db.course.findUnique.mockResolvedValue({ slug: "team-leads" });
    db.course.delete.mockResolvedValue({ id: ID, title: "Team leads" });
    expect(await deleteCourse(ID)).toEqual({ deleted: true });
    expect(db.course.delete).toHaveBeenCalledWith({ where: { id: ID } });
    expect(db.contentChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ summary: "Deleted course “Team leads”" }),
    });
  });

  it("never deletes the main volunteer course", async () => {
    db.course.findUnique.mockResolvedValue({ slug: "volunteers-onboarding" });
    expect(await deleteCourse(ID)).toMatchObject({
      deleted: false,
      reason: expect.stringContaining("main course"),
    });
    expect(db.course.delete).not.toHaveBeenCalled();
  });

  it("refuses when certificates have been issued", async () => {
    db.course.findUnique.mockResolvedValue({ slug: "team-leads" });
    db.course.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("fk", {
        code: "P2003",
        clientVersion: "7",
      }),
    );
    expect(await deleteCourse(ID)).toMatchObject({
      deleted: false,
      reason: expect.stringContaining("certificates"),
    });
  });
});
