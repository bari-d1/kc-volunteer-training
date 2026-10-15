import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VolunteerId } from "@/lib/auth";

vi.mock("server-only", () => ({}));

const prisma = vi.hoisted(() => ({
  block: { findFirst: vi.fn() },
  reflectionAnswer: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const assertUnlocked = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("./progress", async (original) => ({
  ...(await original<typeof import("./progress")>()),
  assertUnlocked: (...a: unknown[]) => assertUnlocked(...(a as [])),
}));

const { saveReflection, getReflectionAnswers, MAX_REFLECTION_LENGTH } =
  await import("./reflections");
const { ProgressError } = await import("./progress");

const volunteer = "v1" as VolunteerId;
const BLOCK = "b1";
const reflection = {
  moduleId: "m1",
  content: {
    prompt: "What's required to serve?",
    revealTitle: "What isn't required",
    revealBody: "Perfection",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.block.findFirst.mockResolvedValue(reflection);
});

describe("saveReflection", () => {
  it("saves the trimmed answer with the question it answers", async () => {
    expect(
      await saveReflection(volunteer, BLOCK, "  A willing heart "),
    ).toEqual({ saved: true });
    expect(prisma.block.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BLOCK, type: "REFLECTION", isPublished: true },
      }),
    );
    expect(assertUnlocked).toHaveBeenCalledWith(volunteer, "m1");
    expect(prisma.reflectionAnswer.upsert).toHaveBeenCalledWith({
      where: { profileId_blockId: { profileId: volunteer, blockId: BLOCK } },
      create: {
        profileId: volunteer,
        blockId: BLOCK,
        moduleId: "m1",
        prompt: "What's required to serve?",
        answer: "A willing heart",
      },
      update: {
        answer: "A willing heart",
        prompt: "What's required to serve?",
      },
    });
  });

  it("clears the answer when it's emptied", async () => {
    expect(await saveReflection(volunteer, BLOCK, "   ")).toEqual({
      saved: false,
    });
    expect(prisma.reflectionAnswer.deleteMany).toHaveBeenCalledWith({
      where: { profileId: volunteer, blockId: BLOCK },
    });
    expect(prisma.reflectionAnswer.upsert).not.toHaveBeenCalled();
  });

  it("only accepts published reflection blocks", async () => {
    prisma.block.findFirst.mockResolvedValue(null);
    await expect(saveReflection(volunteer, BLOCK, "Hi")).rejects.toMatchObject({
      code: "not-found",
    });
    expect(prisma.reflectionAnswer.upsert).not.toHaveBeenCalled();
  });

  it("refuses modules the volunteer hasn't unlocked", async () => {
    assertUnlocked.mockRejectedValueOnce(
      new ProgressError("locked", "Complete the previous module first"),
    );
    await expect(saveReflection(volunteer, BLOCK, "Hi")).rejects.toMatchObject({
      code: "locked",
    });
    expect(prisma.reflectionAnswer.upsert).not.toHaveBeenCalled();
  });

  it("rejects answers over the length limit", async () => {
    await expect(
      saveReflection(volunteer, BLOCK, "x".repeat(MAX_REFLECTION_LENGTH + 1)),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(prisma.block.findFirst).not.toHaveBeenCalled();
  });
});

describe("getReflectionAnswers", () => {
  it("returns the volunteer's answers in a module by block", async () => {
    prisma.reflectionAnswer.findMany.mockResolvedValue([
      { blockId: "b1", answer: "One" },
      { blockId: "b2", answer: "Two" },
    ]);
    expect(await getReflectionAnswers(volunteer, "m1")).toEqual({
      b1: "One",
      b2: "Two",
    });
    expect(prisma.reflectionAnswer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: volunteer, moduleId: "m1", blockId: { not: null } },
      }),
    );
  });
});
