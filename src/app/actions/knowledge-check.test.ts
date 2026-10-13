import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const volunteer = { id: "22222222-2222-4222-8222-222222222222" };
class Redirect extends Error {}
const requireVolunteer = vi.fn(async () => volunteer);
vi.mock("@/lib/auth", () => ({ requireVolunteer: () => requireVolunteer() }));

const findFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { block: { findFirst: (...a: unknown[]) => findFirst(...a) } },
}));

const assertUnlocked = vi.fn(async () => ({}));
const markCheckPassed = vi.fn(async () => ({ passed: true, results: [] }));
vi.mock("@/server/progress", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/progress")>()),
  assertUnlocked: (...a: unknown[]) => assertUnlocked(...(a as [])),
  markCheckPassed: (...a: unknown[]) => markCheckPassed(...(a as [])),
}));

const { checkKnowledgeAnswer, completeKnowledgeCheck } =
  await import("./knowledge-check");
const { ProgressError } = await import("@/server/progress");

const BLOCK_ID = "33333333-3333-4333-8333-333333333333";
const MODULE_ID = "44444444-4444-4444-8444-444444444444";
const block = {
  id: BLOCK_ID,
  moduleId: MODULE_ID,
  content: {
    questions: [
      {
        prompt: "Who do you tell?",
        options: [
          { id: "dsl", text: "The DSL" },
          { id: "nobody", text: "Nobody" },
        ],
        correctOptionId: "dsl",
        explanation: "Always the DSL.",
      },
      {
        prompt: "When?",
        options: [
          { id: "now", text: "Straight away" },
          { id: "later", text: "Next week" },
        ],
        correctOptionId: "now",
        explanation: "Don't wait.",
      },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  requireVolunteer.mockResolvedValue(volunteer);
  findFirst.mockResolvedValue(block);
});

describe("checkKnowledgeAnswer", () => {
  it("confirms a correct answer with the explanation", async () => {
    expect(
      await checkKnowledgeAnswer({
        blockId: BLOCK_ID,
        questionIndex: 0,
        optionId: "dsl",
      }),
    ).toEqual({
      ok: true,
      correct: true,
      explanation: "Always the DSL.",
    });
    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      id: BLOCK_ID,
      type: "KNOWLEDGE_CHECK",
      isPublished: true,
      module: { isPublished: true, course: { isPublished: true } },
    });
    expect(assertUnlocked).toHaveBeenCalledWith(volunteer.id, MODULE_ID);
  });

  it("rejects a wrong answer with the explanation but not the right option", async () => {
    const result = await checkKnowledgeAnswer({
      blockId: BLOCK_ID,
      questionIndex: 0,
      optionId: "nobody",
    });
    expect(result).toEqual({
      ok: true,
      correct: false,
      explanation: "Always the DSL.",
    });
    expect(JSON.stringify(result)).not.toContain("dsl");
  });

  it("returns not-found for a missing block or question", async () => {
    findFirst.mockResolvedValueOnce(null);
    expect(
      await checkKnowledgeAnswer({
        blockId: BLOCK_ID,
        questionIndex: 0,
        optionId: "dsl",
      }),
    ).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(
      await checkKnowledgeAnswer({
        blockId: BLOCK_ID,
        questionIndex: 5,
        optionId: "dsl",
      }),
    ).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("rejects malformed input without touching the database", async () => {
    expect(
      await checkKnowledgeAnswer({
        blockId: "not-a-uuid",
        questionIndex: -1,
        optionId: "",
      }),
    ).toEqual({
      ok: false,
      error: "not-found",
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("refuses questions in a locked module", async () => {
    assertUnlocked.mockRejectedValueOnce(
      new ProgressError("locked", "Complete the previous module first"),
    );
    expect(
      await checkKnowledgeAnswer({
        blockId: BLOCK_ID,
        questionIndex: 0,
        optionId: "dsl",
      }),
    ).toEqual({
      ok: false,
      error: "locked",
    });
  });

  it("requires a signed-in volunteer", async () => {
    requireVolunteer.mockRejectedValueOnce(new Redirect("/sign-in"));
    await expect(
      checkKnowledgeAnswer({
        blockId: BLOCK_ID,
        questionIndex: 0,
        optionId: "dsl",
      }),
    ).rejects.toBeInstanceOf(Redirect);
    expect(findFirst).not.toHaveBeenCalled();
  });
});

describe("completeKnowledgeCheck", () => {
  it("re-grades every question and marks the module's check passed", async () => {
    const result = await completeKnowledgeCheck({
      blockId: BLOCK_ID,
      answers: [
        { questionIndex: 0, optionId: "dsl" },
        { questionIndex: 1, optionId: "now" },
      ],
    });
    expect(result).toEqual({ ok: true, blockPassed: true, modulePassed: true });
    expect(markCheckPassed).toHaveBeenCalledWith(volunteer.id, MODULE_ID, [
      { blockId: BLOCK_ID, questionIndex: 0, optionId: "dsl" },
      { blockId: BLOCK_ID, questionIndex: 1, optionId: "now" },
    ]);
  });

  it("doesn't pass if any question is missing or wrong", async () => {
    const result = await completeKnowledgeCheck({
      blockId: BLOCK_ID,
      answers: [{ questionIndex: 0, optionId: "dsl" }],
    });
    expect(result).toEqual({
      ok: true,
      blockPassed: false,
      modulePassed: false,
    });
    expect(markCheckPassed).not.toHaveBeenCalled();
  });

  it("requires a signed-in volunteer", async () => {
    requireVolunteer.mockRejectedValueOnce(new Redirect("/sign-in"));
    await expect(
      completeKnowledgeCheck({
        blockId: BLOCK_ID,
        answers: [{ questionIndex: 0, optionId: "dsl" }],
      }),
    ).rejects.toBeInstanceOf(Redirect);
    expect(markCheckPassed).not.toHaveBeenCalled();
  });
});
