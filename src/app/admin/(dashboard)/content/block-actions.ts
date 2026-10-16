"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { invalid, type ActionResult } from "@/lib/form-errors";
import {
  createBlock,
  deleteBlock,
  discardModuleChanges,
  duplicateBlock,
  publishModuleChanges,
  reorderBlocks,
  saveBlockDraft,
} from "@/server/admin/blocks";
import { BlockEditError } from "@/server/admin/inputs";

const Id = z.uuid();

async function attempt<T>(task: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await task();
    return { ok: true, data } as ActionResult<T>;
  } catch (error) {
    if (error instanceof BlockEditError) {
      return {
        ok: false,
        error: error.message,
        fieldErrors: error.fieldErrors,
      };
    }
    if (error instanceof z.ZodError) return invalid(error);
    console.error("Block edit failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function createBlockAction(moduleId: string, type: string) {
  await requireAdmin();
  return attempt(() => createBlock(Id.parse(moduleId), type));
}

/** Autosave: writes the draft only if it passes the block's schema. */
export async function saveBlockDraftAction(blockId: string, content: unknown) {
  await requireAdmin();
  return attempt(() => saveBlockDraft(Id.parse(blockId), content));
}

export async function reorderBlocksAction(moduleId: string, ids: string[]) {
  await requireAdmin();
  return attempt(() => reorderBlocks(Id.parse(moduleId), ids));
}

export async function duplicateBlockAction(blockId: string) {
  await requireAdmin();
  return attempt(() => duplicateBlock(Id.parse(blockId)));
}

export async function deleteBlockAction(blockId: string) {
  await requireAdmin();
  return attempt(() => deleteBlock(Id.parse(blockId)));
}

export async function publishModuleChangesAction(moduleId: string) {
  await requireAdmin();
  const result = await attempt(() => publishModuleChanges(Id.parse(moduleId)));
  if (result.ok) revalidatePath("/admin/content", "layout");
  return result;
}

export async function discardModuleChangesAction(moduleId: string) {
  await requireAdmin();
  const result = await attempt(() => discardModuleChanges(Id.parse(moduleId)));
  if (result.ok) revalidatePath("/admin/content", "layout");
  return result;
}
