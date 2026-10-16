"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { invalid, type ActionResult } from "@/lib/form-errors";
import { isUniqueViolation } from "@/server/admin/inputs";
import {
  createLeader,
  createTeam,
  deleteLeader,
  renameTeam,
  reorderBranches,
  reorderLeaders,
  reorderTeams,
  setLeaderActive,
  setTeamActive,
  updateBranch,
  updateLeader,
} from "@/server/admin/people";

const Id = z.uuid();

async function attempt(task: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await task();
    // Volunteers see these straight away; refresh the admin page too.
    revalidatePath("/admin/people");
    return { ok: true };
  } catch (error) {
    if (error instanceof z.ZodError) return invalid(error);
    if (isUniqueViolation(error)) {
      return { ok: false, error: "That name is already used." };
    }
    console.error("People change failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function updateBranchAction(code: string, input: unknown) {
  await requireAdmin();
  return attempt(() => updateBranch(code, input));
}

export async function reorderBranchesAction(codes: string[]) {
  await requireAdmin();
  return attempt(() => reorderBranches(codes));
}

export async function createTeamAction(branchCode: string, name: string) {
  await requireAdmin();
  return attempt(() => createTeam(branchCode, name));
}

export async function renameTeamAction(id: string, name: string) {
  await requireAdmin();
  return attempt(() => renameTeam(Id.parse(id), name));
}

export async function setTeamActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  return attempt(() => setTeamActive(Id.parse(id), isActive));
}

export async function reorderTeamsAction(branchCode: string, ids: string[]) {
  await requireAdmin();
  return attempt(() => reorderTeams(branchCode, ids));
}

export async function saveLeaderAction(id: string | null, input: unknown) {
  await requireAdmin();
  return attempt(() =>
    id ? updateLeader(Id.parse(id), input) : createLeader(input),
  );
}

export async function setLeaderActiveAction(id: string, isActive: boolean) {
  await requireAdmin();
  return attempt(() => setLeaderActive(Id.parse(id), isActive));
}

export async function reorderLeadersAction(group: string, ids: string[]) {
  await requireAdmin();
  return attempt(() => reorderLeaders(group, ids));
}

export async function deleteLeaderAction(id: string) {
  await requireAdmin();
  return attempt(() => deleteLeader(Id.parse(id)));
}
