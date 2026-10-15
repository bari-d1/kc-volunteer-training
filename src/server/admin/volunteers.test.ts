// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));
const deleteAccount = vi.hoisted(() =>
  vi.fn(async () => ({ authUserDeleted: true })),
);
vi.mock("../account", () => ({ deleteAccount }));

const tx = vi.hoisted(() => ({
  quizAttempt: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  moduleProgress: { deleteMany: vi.fn(async () => ({ count: 7 })) },
  contentChange: {
    create: vi.fn<(args: { data: Record<string, unknown> }) => Promise<object>>(
      async () => ({}),
    ),
  },
}));
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  contentChange: {
    create: vi.fn<(args: { data: Record<string, unknown> }) => Promise<object>>(
      async () => ({}),
    ),
  },
  course: { findUnique: vi.fn() },
  profile: { findMany: vi.fn(), findUnique: vi.fn() },
  moduleProgress: { groupBy: vi.fn(), findMany: vi.fn() },
  quizAttempt: { groupBy: vi.fn(), findMany: vi.fn() },
  module: { findMany: vi.fn() },
  certificate: { findUnique: vi.fn() },
  emailLog: { findMany: vi.fn() },
  quizQuestion: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const v = await import("./volunteers");
const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.course.findUnique.mockResolvedValue({
    id: "c1",
    _count: { modules: 12 },
  });
});

describe("listVolunteerRows", () => {
  it("builds each row from grouped queries, then filters", async () => {
    const day = (d: number) => new Date(Date.UTC(2026, 9, d));
    prisma.profile.findMany.mockResolvedValue([
      {
        id: "a",
        firstName: "Ada",
        lastName: "O",
        email: "ada@x.org",
        branchInterest: "CREATIVE",
        teamInterest: "Photography",
        createdAt: day(1),
        _count: { certificates: 0 },
      },
      {
        id: "b",
        firstName: "Bola",
        lastName: "K",
        email: "bola@x.org",
        branchInterest: null,
        teamInterest: null,
        createdAt: day(2),
        _count: { certificates: 1 },
      },
    ]);
    prisma.moduleProgress.groupBy.mockImplementation(async (args) =>
      args._count
        ? [
            { profileId: "a", _count: { _all: 5 } },
            { profileId: "b", _count: { _all: 12 } },
          ]
        : [
            { profileId: "a", _max: { updatedAt: day(6) } },
            { profileId: "b", _max: { updatedAt: day(9) } },
          ],
    );
    prisma.quizAttempt.groupBy.mockResolvedValue([
      { profileId: "b", _count: { _all: 2 }, _max: { submittedAt: day(10) } },
    ]);
    prisma.quizAttempt.findMany.mockResolvedValue([
      { profileId: "b", score: 9, total: 10 },
    ]);

    const rows = await v.listVolunteerRows({}, day(30));
    expect(
      rows.map((r) => [
        r.id,
        r.status,
        r.completedModules,
        r.bestScore,
        r.lastActive,
      ]),
    ).toEqual([
      ["a", "in-progress", 5, null, day(6)],
      ["b", "completed", 12, { score: 9, total: 10 }, day(10)],
    ]);
    expect(
      (await v.listVolunteerRows({ status: "completed" }, day(30))).map(
        (r) => r.id,
      ),
    ).toEqual(["b"]);
    expect(
      (await v.listVolunteerRows({ inactive: true }, day(30))).map((r) => r.id),
    ).toEqual(["a"]);
  });
});

describe("getVolunteerDetail", () => {
  it("returns null for an unknown or malformed id", async () => {
    expect(await v.getVolunteerDetail("nope")).toBeNull();
    prisma.profile.findUnique.mockResolvedValue(null);
    expect(await v.getVolunteerDetail(ID)).toBeNull();
  });

  it("marks each quiz answer right or wrong", async () => {
    prisma.profile.findUnique.mockResolvedValue({ id: ID, firstName: "Ada" });
    prisma.module.findMany.mockResolvedValue([{ id: "m1", title: "Welcome" }]);
    prisma.moduleProgress.findMany.mockResolvedValue([
      {
        moduleId: "m1",
        completedAt: new Date("2026-10-01"),
        checkPassed: false,
        updatedAt: new Date(),
      },
    ]);
    prisma.quizAttempt.findMany.mockResolvedValue([
      {
        id: "att",
        startedAt: new Date(),
        submittedAt: new Date(),
        score: 1,
        total: 2,
        passed: false,
        questionIds: ["q1", "q2"],
        answers: { q1: "a", q2: "b" },
      },
    ]);
    prisma.quizQuestion.findMany.mockResolvedValue([
      {
        id: "q1",
        prompt: "One?",
        correctOptionId: "a",
        options: [
          { id: "a", text: "Yes" },
          { id: "b", text: "No" },
        ],
      },
      {
        id: "q2",
        prompt: "Two?",
        correctOptionId: "a",
        options: [
          { id: "a", text: "Up" },
          { id: "b", text: "Down" },
        ],
      },
    ]);
    prisma.certificate.findUnique.mockResolvedValue(null);
    prisma.emailLog.findMany.mockResolvedValue([]);

    const detail = await v.getVolunteerDetail(ID);
    expect(detail?.modules).toEqual([
      {
        id: "m1",
        title: "Welcome",
        completedAt: new Date("2026-10-01"),
        started: true,
      },
    ]);
    expect(detail?.attempts[0].answers).toEqual([
      {
        questionId: "q1",
        prompt: "One?",
        answer: "Yes",
        correctAnswer: "Yes",
        correct: true,
      },
      {
        questionId: "q2",
        prompt: "Two?",
        answer: "Down",
        correctAnswer: "Up",
        correct: false,
      },
    ]);
    // All questions in one query.
    expect(prisma.quizQuestion.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("admin actions", () => {
  it("resets only unsubmitted quiz attempts, and logs it", async () => {
    expect(await v.resetQuizAttempts(ID)).toBe(1);
    expect(tx.quizAttempt.deleteMany).toHaveBeenCalledWith({
      where: { profileId: ID, submittedAt: null },
    });
    expect(tx.contentChange.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entity: "Profile",
        entityId: ID,
        summary: "Reset quiz attempts (1 unsubmitted deleted)",
      }),
    });
  });

  it("resets module progress, and logs it", async () => {
    expect(await v.resetModuleProgress(ID)).toBe(7);
    expect(tx.moduleProgress.deleteMany).toHaveBeenCalledWith({
      where: { profileId: ID },
    });
    expect(tx.contentChange.create.mock.calls[0][0].data.summary).toBe(
      "Reset module progress (7 modules)",
    );
  });

  it("deletes like account deletion and logs without the name", async () => {
    await v.deleteVolunteer(ID);
    expect(deleteAccount).toHaveBeenCalledWith(ID);
    expect(prisma.contentChange.create).toHaveBeenCalledWith({
      data: {
        entity: "Profile",
        entityId: ID,
        action: "delete",
        summary: "Deleted a volunteer and their sign-in",
      },
    });
  });

  it("flags a sign-in that couldn't be removed", async () => {
    deleteAccount.mockResolvedValueOnce({ authUserDeleted: false });
    await v.deleteVolunteer(ID);
    expect(prisma.contentChange.create.mock.calls[0][0].data.summary).toMatch(
      /couldn't be removed/,
    );
  });
});
