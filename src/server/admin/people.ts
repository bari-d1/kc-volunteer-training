import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { LeaderGroupSchema } from "@/lib/schemas/blocks";
import { NonEmptyString, UrlOrPathSchema } from "@/lib/schemas/common";
import { BRAND_PALETTE } from "@/lib/brand-palette";
import { logChange } from "./change-log";

const BranchCodeSchema = z.enum([
  "EXPERIENCE",
  "MINISTRY",
  "CREATIVE",
  "SYSTEMS",
]);
const ColourSchema = z.enum(
  BRAND_PALETTE.map((c) => c.hex) as [string, ...string[]],
  { message: "Choose one of the brand colours" },
);

/** Branches in order, each with every team (active or not) in order. */
export async function listBranchesWithTeams() {
  await requireAdmin();
  return prisma.branch.findMany({
    orderBy: { order: "asc" },
    include: {
      teams: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      _count: { select: { leaders: true } },
    },
  });
}

export const BranchInputSchema = z.object({
  name: NonEmptyString.max(60),
  description: NonEmptyString.max(300),
  colour: ColourSchema,
});

/** Edits a branch. Its code (EXPERIENCE…) never changes. */
export async function updateBranch(code: string, input: unknown) {
  await requireAdmin();
  const branchCode = BranchCodeSchema.parse(code);
  const data = BranchInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.update({
      where: { code: branchCode },
      data,
    });
    await logChange(
      tx,
      "Branch",
      branch.id,
      "update",
      `Updated branch “${branch.name}”`,
    );
    return branch;
  });
}

/** Sets branch order to the position of each code in the list. */
export async function reorderBranches(codes: unknown) {
  await requireAdmin();
  const list = z.array(BranchCodeSchema).length(4).parse(codes);
  if (new Set(list).size !== 4) throw new Error("Each branch must appear once");
  await prisma.$transaction(async (tx) => {
    for (const [order, code] of list.entries()) {
      await tx.branch.update({ where: { code }, data: { order } });
    }
    await logChange(tx, "Branch", "all", "reorder", "Reordered branches");
  });
}

const TeamNameSchema = NonEmptyString.max(80);

/** Adds an active team at the end of the branch. */
export async function createTeam(branchCode: string, name: unknown) {
  await requireAdmin();
  const code = BranchCodeSchema.parse(branchCode);
  const teamName = TeamNameSchema.parse(name);
  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findUniqueOrThrow({
      where: { code },
      select: { id: true, name: true },
    });
    const last = await tx.team.findFirst({
      where: { branchId: branch.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const team = await tx.team.create({
      data: {
        branchId: branch.id,
        name: teamName,
        order: (last?.order ?? -1) + 1,
      },
    });
    await logChange(
      tx,
      "Team",
      team.id,
      "create",
      `Added team “${teamName}” to ${branch.name}`,
    );
    return team;
  });
}

/**
 * Renames a team. Volunteers who already chose it keep the name they
 * picked (profiles store the name, like a snapshot).
 */
export async function renameTeam(id: string, name: unknown) {
  await requireAdmin();
  const teamName = TeamNameSchema.parse(name);
  return prisma.$transaction(async (tx) => {
    const before = await tx.team.findUniqueOrThrow({
      where: { id },
      select: { name: true },
    });
    const team = await tx.team.update({
      where: { id },
      data: { name: teamName },
    });
    await logChange(
      tx,
      "Team",
      id,
      "update",
      `Renamed team “${before.name}” to “${teamName}”`,
    );
    return team;
  });
}

/** Deactivated teams leave the onboarding dropdown but stay on profiles. */
export async function setTeamActive(id: string, isActive: boolean) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const team = await tx.team.update({
      where: { id },
      data: { isActive: isActive === true },
    });
    await logChange(
      tx,
      "Team",
      id,
      isActive ? "publish" : "unpublish",
      `${isActive ? "Activated" : "Deactivated"} team “${team.name}”`,
    );
    return team;
  });
}

/** Sets team order within a branch to the position of each id. */
export async function reorderTeams(branchCode: string, ids: unknown) {
  await requireAdmin();
  const code = BranchCodeSchema.parse(branchCode);
  const list = z.array(z.uuid()).min(1).parse(ids);
  await prisma.$transaction(async (tx) => {
    const count = await tx.team.count({
      where: { id: { in: list }, branch: { code } },
    });
    if (count !== list.length)
      throw new Error("Every team must belong to this branch");
    for (const [order, id] of list.entries()) {
      await tx.team.update({ where: { id }, data: { order } });
    }
    await logChange(
      tx,
      "Branch",
      code,
      "reorder",
      `Reordered teams in ${code.toLowerCase()}`,
    );
  });
}

/** Leaders in order, active and inactive, with their branch. */
export async function listLeaders() {
  await requireAdmin();
  return prisma.leader.findMany({
    orderBy: [{ group: "asc" }, { order: "asc" }, { name: "asc" }],
    include: { branch: { select: { code: true, name: true } } },
  });
}

export const LeaderInputSchema = z.object({
  name: NonEmptyString.max(100),
  role: NonEmptyString.max(100),
  photoUrl: UrlOrPathSchema.nullable().default(null),
  branchCode: BranchCodeSchema.nullable().default(null),
  group: LeaderGroupSchema,
  isActive: z.boolean().default(true),
});

async function branchIdFor(code: string | null) {
  if (!code) return null;
  const branch = await prisma.branch.findUnique({
    where: { code: BranchCodeSchema.parse(code) },
    select: { id: true },
  });
  return branch?.id ?? null;
}

/** Adds a leader at the end of their group. */
export async function createLeader(input: unknown) {
  await requireAdmin();
  const { branchCode, ...data } = LeaderInputSchema.parse(input);
  const branchId = await branchIdFor(branchCode);
  return prisma.$transaction(async (tx) => {
    const last = await tx.leader.findFirst({
      where: { group: data.group },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const leader = await tx.leader.create({
      data: { ...data, branchId, order: (last?.order ?? -1) + 1 },
    });
    await logChange(
      tx,
      "Leader",
      leader.id,
      "create",
      `Added leader “${leader.name}”`,
    );
    return leader;
  });
}

export async function updateLeader(id: string, input: unknown) {
  await requireAdmin();
  const { branchCode, ...data } = LeaderInputSchema.parse(input);
  const branchId = await branchIdFor(branchCode);
  return prisma.$transaction(async (tx) => {
    const before = await tx.leader.findUniqueOrThrow({
      where: { id },
      select: { group: true },
    });
    // Moving to another group puts them at the end of it.
    const order =
      before.group === data.group
        ? undefined
        : ((
            await tx.leader.findFirst({
              where: { group: data.group },
              orderBy: { order: "desc" },
              select: { order: true },
            })
          )?.order ?? -1) + 1;
    const leader = await tx.leader.update({
      where: { id },
      data: { ...data, branchId, ...(order !== undefined && { order }) },
    });
    await logChange(
      tx,
      "Leader",
      id,
      "update",
      `Updated leader “${leader.name}”`,
    );
    return leader;
  });
}

export async function setLeaderActive(id: string, isActive: boolean) {
  await requireAdmin();
  return prisma.$transaction(async (tx) => {
    const leader = await tx.leader.update({
      where: { id },
      data: { isActive: isActive === true },
    });
    await logChange(
      tx,
      "Leader",
      id,
      isActive ? "publish" : "unpublish",
      `${isActive ? "Showed" : "Hid"} leader “${leader.name}”`,
    );
    return leader;
  });
}

/** Sets leader order within a group to the position of each id. */
export async function reorderLeaders(group: string, ids: unknown) {
  await requireAdmin();
  const leaderGroup = LeaderGroupSchema.parse(group);
  const list = z.array(z.uuid()).min(1).parse(ids);
  await prisma.$transaction(async (tx) => {
    const count = await tx.leader.count({
      where: { id: { in: list }, group: leaderGroup },
    });
    if (count !== list.length)
      throw new Error("Every leader must be in this group");
    for (const [order, id] of list.entries()) {
      await tx.leader.update({ where: { id }, data: { order } });
    }
    await logChange(
      tx,
      "Leader",
      leaderGroup,
      "reorder",
      `Reordered ${leaderGroup.toLowerCase()} leaders`,
    );
  });
}
