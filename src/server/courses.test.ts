import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VolunteerId } from "@/lib/auth";
import { createFakePrisma, module, uuid } from "./__tests__/fake-prisma";

vi.mock("server-only", () => ({}));
const fake = createFakePrisma();
vi.mock("@/lib/prisma", () => ({ prisma: fake.prisma }));

const { getModulesWithProgress, getModuleForVolunteer } =
  await import("./courses");

const volunteer = uuid() as VolunteerId;
const otherVolunteer = uuid() as VolunteerId;
const courseId = uuid();

beforeEach(() => {
  const { db } = fake;
  db.courses = [{ id: courseId, isPublished: true }];
  db.modules = [
    module(courseId, "welcome", 0),
    module(courseId, "draft", 1, { isPublished: false }),
    module(courseId, "about-kc", 2),
    module(courseId, "our-values", 3),
  ];
  db.blocks = [];
  db.progress = [];
});

const complete = (slug: string, profileId: string = volunteer) => {
  const m = fake.db.modules.find((x) => x.slug === slug)!;
  fake.db.progress.push({
    profileId,
    moduleId: m.id,
    lastBlockOrder: 0,
    checkPassed: false,
    completedAt: new Date(),
  });
};

describe("getModulesWithProgress", () => {
  it("lists published modules in order with statuses", async () => {
    complete("welcome");
    const modules = await getModulesWithProgress(courseId, volunteer);
    expect(modules.map((m) => [m.slug, m.status])).toEqual([
      ["welcome", "completed"],
      ["about-kc", "in-progress"],
      ["our-values", "locked"],
    ]);
  });

  it("skips unpublished modules in the chain", async () => {
    // "draft" sits between welcome and about-kc but doesn't block it.
    complete("welcome");
    const modules = await getModulesWithProgress(courseId, volunteer);
    expect(modules.find((m) => m.slug === "about-kc")?.status).toBe(
      "in-progress",
    );
  });

  it("only counts the volunteer's own progress", async () => {
    complete("welcome", otherVolunteer);
    const modules = await getModulesWithProgress(courseId, volunteer);
    expect(modules[0].status).toBe("in-progress");
    expect(modules[1].status).toBe("locked");
  });

  it("returns nothing for an unpublished course", async () => {
    fake.db.courses[0].isPublished = false;
    expect(await getModulesWithProgress(courseId, volunteer)).toEqual([]);
  });
});

describe("getModuleForVolunteer", () => {
  it("refuses a locked module and says what unlocks it", async () => {
    const result = await getModuleForVolunteer(courseId, "about-kc", volunteer);
    expect(result).toMatchObject({
      status: "locked",
      module: { slug: "about-kc" },
      unlockedBy: { slug: "welcome" },
    });
    expect(result).not.toHaveProperty("blocks");
  });

  it("treats unpublished and unknown modules as not found", async () => {
    expect(await getModuleForVolunteer(courseId, "draft", volunteer)).toEqual({
      status: "not-found",
    });
    expect(await getModuleForVolunteer(courseId, "nope", volunteer)).toEqual({
      status: "not-found",
    });
  });

  it("returns parsed published blocks with neighbours once unlocked", async () => {
    complete("welcome");
    const target = fake.db.modules.find((m) => m.slug === "about-kc")!;
    fake.db.blocks = [
      {
        id: uuid(),
        moduleId: target.id,
        order: 1,
        type: "TEXT",
        content: { markdown: "Hi" },
        isPublished: true,
      },
      {
        id: uuid(),
        moduleId: target.id,
        order: 0,
        type: "HEADING",
        content: { text: "About", level: 1 },
        isPublished: true,
      },
      {
        id: uuid(),
        moduleId: target.id,
        order: 2,
        type: "TEXT",
        content: { markdown: "Draft" },
        isPublished: false,
      },
    ];

    const result = await getModuleForVolunteer(courseId, "about-kc", volunteer);
    if (result.status !== "in-progress")
      throw new Error(`unexpected ${result.status}`);
    expect(result.blocks.map((b) => b.type)).toEqual(["HEADING", "TEXT"]);
    expect(result.previous?.slug).toBe("welcome");
    expect(result.next).toMatchObject({ slug: "our-values", status: "locked" });
  });

  it("skips invalid blocks instead of failing the lesson", async () => {
    const target = fake.db.modules[0];
    fake.db.blocks = [
      {
        id: uuid(),
        moduleId: target.id,
        order: 0,
        type: "TEXT",
        content: { wrong: true },
        isPublished: true,
      },
      {
        id: uuid(),
        moduleId: target.id,
        order: 1,
        type: "TEXT",
        content: { markdown: "ok" },
        isPublished: true,
      },
    ];
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await getModuleForVolunteer(courseId, "welcome", volunteer);
    expect(
      result.status !== "not-found" &&
        result.status !== "locked" &&
        result.blocks,
    ).toHaveLength(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("has invalid content"),
    );
    error.mockRestore();
  });

  it("strips knowledge-check answers before blocks reach the volunteer", async () => {
    const target = fake.db.modules[0];
    fake.db.blocks = [
      {
        id: uuid(),
        moduleId: target.id,
        order: 0,
        type: "KNOWLEDGE_CHECK",
        isPublished: true,
        content: {
          questions: [
            {
              prompt: "Is KC a family?",
              options: [
                { id: "a", text: "Yes" },
                { id: "b", text: "No" },
              ],
              correctOptionId: "a",
              explanation: "We're one family.",
            },
          ],
        },
      },
    ];
    const result = await getModuleForVolunteer(courseId, "welcome", volunteer);
    if (result.status === "not-found" || result.status === "locked")
      throw new Error();
    expect(result.blocks[0].content).toEqual({
      questions: [
        {
          prompt: "Is KC a family?",
          options: [
            { id: "a", text: "Yes" },
            { id: "b", text: "No" },
          ],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("correctOptionId");
    expect(JSON.stringify(result)).not.toContain("We're one family.");
  });
});
