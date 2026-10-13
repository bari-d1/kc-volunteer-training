import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VolunteerId } from "@/lib/auth";
import { createFakePrisma, module, uuid } from "./__tests__/fake-prisma";

vi.mock("server-only", () => ({}));
const fake = createFakePrisma();
vi.mock("@/lib/prisma", () => ({ prisma: fake.prisma }));

const { completeModule, markCheckPassed, saveProgress } =
  await import("./progress");
const { getModulesWithProgress } = await import("./courses");

const volunteer = uuid() as VolunteerId;
const courseId = uuid();
let first: ReturnType<typeof module>;
let second: ReturnType<typeof module>;
let third: ReturnType<typeof module>;
let checkBlockId: string;

beforeEach(() => {
  first = module(courseId, "welcome", 0);
  second = module(courseId, "safeguarding", 1, { requiresCheck: true });
  third = module(courseId, "final", 2);
  checkBlockId = uuid();
  fake.db.courses = [{ id: courseId, isPublished: true }];
  fake.db.modules = [first, second, third];
  fake.db.progress = [];
  fake.db.blocks = [
    {
      id: checkBlockId,
      moduleId: second.id,
      order: 0,
      type: "KNOWLEDGE_CHECK",
      isPublished: true,
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
        ],
      },
    },
  ];
});

const statuses = async () =>
  (await getModulesWithProgress(courseId, volunteer)).map((m) => m.status);

describe("unlock rules on writes", () => {
  it("refuses to save progress on a locked module", async () => {
    await expect(saveProgress(volunteer, second.id, 3)).rejects.toMatchObject({
      code: "locked",
    });
    expect(fake.db.progress).toHaveLength(0);
  });

  it("refuses to complete a locked module", async () => {
    await expect(completeModule(volunteer, third.id)).rejects.toMatchObject({
      code: "locked",
    });
  });

  it("refuses unpublished modules", async () => {
    first.isPublished = false;
    await expect(saveProgress(volunteer, first.id, 0)).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("completing a module unlocks the next one", async () => {
    expect(await statuses()).toEqual(["in-progress", "locked", "locked"]);
    await completeModule(volunteer, first.id);
    expect(await statuses()).toEqual(["completed", "in-progress", "locked"]);
  });
});

describe("saveProgress", () => {
  it("only moves forward", async () => {
    await saveProgress(volunteer, first.id, 4);
    await saveProgress(volunteer, first.id, 2);
    expect(fake.db.progress[0].lastBlockOrder).toBe(4);
  });

  it("rejects negative or fractional positions", async () => {
    await expect(saveProgress(volunteer, first.id, -1)).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(saveProgress(volunteer, first.id, 1.5)).rejects.toMatchObject({
      code: "invalid",
    });
  });
});

describe("knowledge check gate", () => {
  beforeEach(async () => {
    await completeModule(volunteer, first.id);
  });

  it("won't complete a requiresCheck module before the check is passed", async () => {
    await expect(completeModule(volunteer, second.id)).rejects.toMatchObject({
      code: "check-required",
    });
  });

  it("grades on the server and only passes with every answer right", async () => {
    const wrong = await markCheckPassed(volunteer, second.id, [
      { blockId: checkBlockId, questionIndex: 0, optionId: "nobody" },
    ]);
    expect(wrong.passed).toBe(false);
    expect(wrong.results[0]).toMatchObject({
      correct: false,
      correctOptionId: "dsl",
    });
    await expect(completeModule(volunteer, second.id)).rejects.toMatchObject({
      code: "check-required",
    });

    const right = await markCheckPassed(volunteer, second.id, [
      { blockId: checkBlockId, questionIndex: 0, optionId: "dsl" },
    ]);
    expect(right.passed).toBe(true);
    await completeModule(volunteer, second.id);
    expect(await statuses()).toEqual(["completed", "completed", "in-progress"]);
  });

  it("rejects malformed answers", async () => {
    await expect(
      markCheckPassed(volunteer, second.id, { dsl: true }),
    ).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("is idempotent once complete", async () => {
    const firstTime = await completeModule(volunteer, first.id);
    expect(firstTime.completedAt).toBeInstanceOf(Date);
  });
});
