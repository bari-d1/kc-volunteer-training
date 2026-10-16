"use server";

import { z } from "zod";
import type { MediaKind } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { invalid, type ActionResult } from "@/lib/form-errors";
import { BlockEditError } from "@/server/admin/inputs";
import {
  createMediaUpload,
  deleteMedia,
  listMedia,
  registerMedia,
} from "@/server/admin/media";

async function attempt<T>(task: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await task() } as ActionResult<T>;
  } catch (error) {
    if (error instanceof BlockEditError)
      return { ok: false, error: error.message };
    if (error instanceof z.ZodError) return invalid(error);
    console.error("Media action failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Step 1: a signed URL for the browser to upload one file to. */
export async function createMediaUploadAction(input: {
  kind: MediaKind;
  filename: string;
  mimeType: string;
  size: number;
}) {
  await requireAdmin();
  return attempt(() => createMediaUpload(input));
}

/** Step 2: record the uploaded file in the media library. */
export async function registerMediaAction(input: unknown) {
  await requireAdmin();
  return attempt(async () => {
    const media = await registerMedia(input);
    return { id: media.id, url: media.url, altText: media.altText };
  });
}

export async function listMediaAction(kind?: MediaKind) {
  await requireAdmin();
  return attempt(async () =>
    (await listMedia(kind)).map((m) => ({
      id: m.id,
      kind: m.kind,
      url: m.url,
      filename: m.filename,
      size: m.size,
      altText: m.altText,
      createdAt: m.createdAt,
    })),
  );
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await attempt(() => deleteMedia(z.uuid().parse(id)));
  if (!result.ok) return result;
  return result.data.deleted
    ? { ok: true }
    : { ok: false, error: result.data.reason };
}
