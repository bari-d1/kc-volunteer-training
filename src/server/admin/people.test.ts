// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => {} }));

const logged: Array<Record<string, unknown>> = [];
const tx = vi.hoisted(() => ({
  branch: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
  team: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    count: vi.fn(),
  },
  leader: {
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    count: vi.fn(),
  },
  contentChange: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...tx,
    branch: {
      ...tx.branch,
      findUnique: vi.fn(async () => ({ id: "branch-ministry" })),
    },
    $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
  },
}));

const people = await import("./people");
const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  logged.length = 0;
  tx.contentChange.create.mockImplementation(async ({ data }) =>
    logged.push(data),
  );
});

describe("branches", () => {
  it("edits name, description and colour, logging it", async () => {
    tx.branch.update.mockResolvedValue({ id: "b1", name: "Ministry" });
    await people.updateBranch("MINISTRY", {
      name: "Ministry",
      description: "Beyond Sunday teams.",
      colour: "#FF5FC8",
    });
    expect(tx.branch.update).toHaveBeenCalledWith({
      where: { code: "MINISTRY" },
      data: {
        name: "Ministry",
        description: "Beyond Sunday teams.",
        colour: "#FF5FC8",
      },
    });
    expect(logged[0]).toMatchObject({
      entity: "Branch",
      summary: "Updated branch “Ministry”",
    });
  });

  it("only accepts the four codes and the brand colours", async () => {
    await expect(
      people.updateBranch("WORSHIP", {
        name: "x",
        description: "y",
        colour: "#FF5FC8",
      }),
    ).rejects.toThrow();
    await expect(
      people.updateBranch("MINISTRY", {
        name: "x",
        description: "y",
        colour: "#123456",
      }),
    ).rejects.toThrow(/brand colours/);
    expect(tx.branch.update).not.toHaveBeenCalled();
  });

  it("reorders all four, each once", async () => {
    await people.reorderBranches([
      "SYSTEMS",
      "CREATIVE",
      "MINISTRY",
      "EXPERIENCE",
    ]);
    expect(tx.branch.update.mock.calls.map((c) => c[0])).toEqual([
      { where: { code: "SYSTEMS" }, data: { order: 0 } },
      { where: { code: "CREATIVE" }, data: { order: 1 } },
      { where: { code: "MINISTRY" }, data: { order: 2 } },
      { where: { code: "EXPERIENCE" }, data: { order: 3 } },
    ]);
    await expect(
      people.reorderBranches(["SYSTEMS", "SYSTEMS", "MINISTRY", "EXPERIENCE"]),
    ).rejects.toThrow();
  });
});

describe("teams", () => {
  it("adds a team at the end of its branch", async () => {
    tx.branch.findUniqueOrThrow.mockResolvedValue({
      id: "b1",
      name: "Ministry",
    });
    tx.team.findFirst.mockResolvedValue({ order: 12 });
    tx.team.create.mockResolvedValue({ id: "t1" });
    await people.createTeam("MINISTRY", "  Prayer Ministry ");
    expect(tx.team.create).toHaveBeenCalledWith({
      data: { branchId: "b1", name: "Prayer Ministry", order: 13 },
    });
    expect(logged[0].summary).toBe("Added team “Prayer Ministry” to Ministry");
  });

  it("deactivates without deleting, logging it", async () => {
    tx.team.update.mockResolvedValue({ id: ID, name: "Bubbles" });
    await people.setTeamActive(ID, false);
    expect(tx.team.update).toHaveBeenCalledWith({
      where: { id: ID },
      data: { isActive: false },
    });
    expect(logged[0]).toMatchObject({
      action: "unpublish",
      summary: "Deactivated team “Bubbles”",
    });
  });

  it("renames, logging the old and new names", async () => {
    tx.team.findUniqueOrThrow.mockResolvedValue({ name: "CTRL C" });
    tx.team.update.mockResolvedValue({ id: ID, name: "Control C" });
    await people.renameTeam(ID, "Control C");
    expect(logged[0].summary).toBe("Renamed team “CTRL C” to “Control C”");
  });

  it("only reorders teams in that branch", async () => {
    tx.team.count.mockResolvedValue(1);
    await expect(
      people.reorderTeams("MINISTRY", [ID, ID.replace("1111", "2222")]),
    ).rejects.toThrow(/belong/);
  });
});

describe("leaders", () => {
  const input = {
    name: "Princess Omosebi",
    role: "Ministry Lead",
    photoUrl: null,
    branchCode: "MINISTRY",
    group: "BRANCH_LEAD",
    isActive: true,
  };

  it("adds a leader at the end of their group, linked to the branch", async () => {
    tx.leader.findFirst.mockResolvedValue({ order: 4 });
    tx.leader.create.mockResolvedValue({ id: "l1", name: "Princess Omosebi" });
    await people.createLeader(input);
    expect(tx.leader.create).toHaveBeenCalledWith({
      data: {
        name: "Princess Omosebi",
        role: "Ministry Lead",
        photoUrl: null,
        group: "BRANCH_LEAD",
        isActive: true,
        branchId: "branch-ministry",
        order: 5,
      },
    });
  });

  it("moves a leader to the end of a new group", async () => {
    tx.leader.findUniqueOrThrow.mockResolvedValue({ group: "TEAM_LEAD" });
    tx.leader.findFirst.mockResolvedValue({ order: 2 });
    tx.leader.update.mockResolvedValue({ id: ID, name: "Princess Omosebi" });
    await people.updateLeader(ID, input);
    expect(tx.leader.update.mock.calls[0][0].data.order).toBe(3);
  });

  it("keeps a leader's place when their group doesn't change", async () => {
    tx.leader.findUniqueOrThrow.mockResolvedValue({ group: "BRANCH_LEAD" });
    tx.leader.update.mockResolvedValue({ id: ID, name: "Princess Omosebi" });
    await people.updateLeader(ID, input);
    expect(tx.leader.update.mock.calls[0][0].data).not.toHaveProperty("order");
  });

  it("requires a name and role", async () => {
    await expect(
      people.createLeader({ ...input, name: "", role: "" }),
    ).rejects.toThrow();
  });
});

describe("deleting a leader", () => {
  it("deletes them and logs it by name", async () => {
    tx.leader.delete.mockResolvedValue({ id: ID, name: "Yemi" });
    await people.deleteLeader(ID);
    expect(tx.leader.delete).toHaveBeenCalledWith({ where: { id: ID } });
    expect(logged).toEqual([
      expect.objectContaining({
        entity: "Leader",
        action: "delete",
        summary: "Deleted leader “Yemi”",
      }),
    ]);
  });
});
