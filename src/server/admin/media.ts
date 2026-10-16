import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { MediaKind } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { MEDIA_BUCKET, storagePath, uploadProblem } from "@/lib/media-upload";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { logChange } from "./change-log";
import { BlockEditError } from "./inputs";

const KindSchema = z.enum(["IMAGE", "VIDEO", "CAPTIONS"]);

const UploadRequestSchema = z.object({
  kind: KindSchema,
  filename: z.string().trim().min(1).max(200),
  mimeType: z.string().max(100),
  size: z.number().int().positive(),
});

/**
 * A signed URL the browser uploads one file to directly, so large videos
 * never pass through the Next.js server. Type and size are checked first.
 */
export async function createMediaUpload(input: unknown) {
  await requireAdmin();
  const request = UploadRequestSchema.parse(input);
  const problem = uploadProblem(request.kind, {
    name: request.filename,
    type: request.mimeType,
    size: request.size,
  });
  if (problem) throw new BlockEditError(problem);

  const path = storagePath(request.filename, randomUUID());
  const { data, error } = await createAdminClient()
    .storage.from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(`Couldn't create an upload URL: ${error?.message}`);
  }
  return { path: data.path, token: data.token };
}

const RegisterSchema = z
  .object({
    kind: KindSchema,
    path: z.string().regex(/^\d{4}\/\d{2}\/[0-9a-f-]{36}-[a-z0-9.-]+$/),
    filename: z.string().trim().min(1).max(200),
    mimeType: z.string().max(100),
    size: z.number().int().positive(),
    altText: z.string().trim().max(300).optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .refine((m) => m.kind !== "IMAGE" || Boolean(m.altText), {
    path: ["altText"],
    message: "Describe the image for people who can't see it.",
  });

/** Records an uploaded file in the media library, once it's really there. */
export async function registerMedia(input: unknown) {
  await requireAdmin();
  const media = RegisterSchema.parse(input);
  const storage = createAdminClient().storage.from(MEDIA_BUCKET);
  const { data: exists } = await storage.exists(media.path);
  if (!exists) throw new BlockEditError("The upload didn't finish. Try again.");
  const url = storage.getPublicUrl(media.path).data.publicUrl;

  return prisma.$transaction(async (tx) => {
    const row = await tx.media.create({
      data: { ...media, url, altText: media.altText || null },
    });
    await logChange(
      tx,
      "Media",
      row.id,
      "create",
      `Uploaded ${media.kind.toLowerCase()} “${media.filename}”`,
    );
    return row;
  });
}

/** The media library, newest first, optionally one kind. */
export async function listMedia(kind?: MediaKind) {
  await requireAdmin();
  return prisma.media.findMany({
    where: kind ? { kind } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/** How many blocks (published or draft) and leaders use this URL. */
async function countUses(url: string) {
  const [blocks, leaders] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM "Block"
      WHERE position(${url} in content::text) > 0
         OR position(${url} in coalesce("draftContent"::text, '')) > 0`,
    prisma.leader.count({ where: { photoUrl: url } }),
  ]);
  return Number(blocks[0]?.count ?? 0) + leaders;
}

/**
 * Deletes a file from the library and Storage, unless a block or leader
 * still uses it.
 */
export async function deleteMedia(id: string) {
  await requireAdmin();
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return { deleted: true as const };
  const uses = await countUses(media.url);
  if (uses > 0) {
    return {
      deleted: false as const,
      reason: `It's used in ${uses} place${uses === 1 ? "" : "s"}. Remove it from those first.`,
    };
  }
  const { error } = await createAdminClient()
    .storage.from(MEDIA_BUCKET)
    .remove([media.path]);
  if (error) throw new Error(`Couldn't delete the file: ${error.message}`);
  await prisma.$transaction(async (tx) => {
    await tx.media.delete({ where: { id } });
    await logChange(
      tx,
      "Media",
      id,
      "delete",
      `Deleted ${media.kind.toLowerCase()} “${media.filename}”`,
    );
  });
  return { deleted: true as const };
}
