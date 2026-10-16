// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { BlockSchema, type VolunteerBlock } from "@/lib/schemas/blocks";

vi.mock("server-only", () => ({}));
const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { leader: { findMany } } }));

const { resolvePeopleBlocks } = await import("./people-blocks");

const block = (id: string, content: object) =>
  ({ id, type: "PEOPLE", content }) as VolunteerBlock;

describe("PEOPLE block schema", () => {
  it("needs people unless it shows a leader group", () => {
    expect(
      BlockSchema.safeParse({ type: "PEOPLE", content: { people: [] } })
        .success,
    ).toBe(false);
    expect(
      BlockSchema.safeParse({
        type: "PEOPLE",
        content: { people: [], source: { group: "BRANCH_LEAD" } },
      }).success,
    ).toBe(true);
    expect(
      BlockSchema.safeParse({
        type: "PEOPLE",
        content: { people: [], source: { group: "PASTORS" } },
      }).success,
    ).toBe(false);
  });
});

describe("resolvePeopleBlocks", () => {
  it("leaves pages without auto blocks alone, without a query", async () => {
    const blocks = [block("p", { people: [{ name: "Ada", role: "Lead" }] })];
    expect(await resolvePeopleBlocks(blocks)).toBe(blocks);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("fills auto blocks with that group's active leaders, in one query", async () => {
    findMany.mockResolvedValueOnce([
      {
        name: "Adanna",
        role: "Experience Lead",
        photoUrl: "/a.jpg",
        group: "BRANCH_LEAD",
        branch: { code: "EXPERIENCE" },
      },
      {
        name: "Pastor Joshua",
        role: "Team Lead",
        photoUrl: null,
        group: "CHURCH_FAMILY",
        branch: null,
      },
    ]);
    const result = await resolvePeopleBlocks([
      { id: "t", type: "TEXT", content: { markdown: "Hi" } } as VolunteerBlock,
      block("leads", { people: [], source: { group: "BRANCH_LEAD" } }),
      block("family", { people: [], source: { group: "CHURCH_FAMILY" } }),
    ]);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).toEqual({
      isActive: true,
      group: { in: ["BRANCH_LEAD", "CHURCH_FAMILY"] },
    });
    expect(result.map((b) => b.id)).toEqual(["t", "leads", "family"]);
    expect(result[1].content).toMatchObject({
      people: [
        {
          name: "Adanna",
          role: "Experience Lead",
          photoUrl: "/a.jpg",
          ringColour: "experience",
        },
      ],
    });
    expect(result[2].content).toMatchObject({
      people: [{ name: "Pastor Joshua", role: "Team Lead" }],
    });
  });

  it("leaves out an auto block whose group has nobody active", async () => {
    findMany.mockResolvedValueOnce([]);
    expect(
      await resolvePeopleBlocks([
        block("empty", { people: [], source: { group: "TEAM_LEAD" } }),
      ]),
    ).toEqual([]);
  });
});
