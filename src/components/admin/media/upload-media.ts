"use client";

import {
  createMediaUploadAction,
  registerMediaAction,
} from "@/app/admin/(dashboard)/content/media-actions";
import {
  MAX_IMAGE_WIDTH,
  MEDIA_BUCKET,
  MEDIA_RULES,
  formatBytes,
  uploadProblem,
  type MediaKindName,
} from "@/lib/media-upload";
import { createClient } from "@/lib/supabase/client";

export type UploadStep = "resizing" | "uploading" | "saving";
export type UploadedMedia = { id: string; url: string; altText: string | null };

/**
 * Images wider than MAX_IMAGE_WIDTH are scaled down and turned into WebP
 * in the browser, so huge phone photos upload quickly.
 */
export async function prepareImage(
  file: File,
): Promise<{ file: File; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (width <= MAX_IMAGE_WIDTH) {
    bitmap.close();
    return { file, width, height };
  }
  const scaledHeight = Math.round((height * MAX_IMAGE_WIDTH) / width);
  const canvas = document.createElement("canvas");
  canvas.width = MAX_IMAGE_WIDTH;
  canvas.height = scaledHeight;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, 0, 0, MAX_IMAGE_WIDTH, scaledHeight);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) throw new Error("Couldn't resize that image.");
  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return {
    file: new File([blob], name, { type: "image/webp" }),
    width: MAX_IMAGE_WIDTH,
    height: scaledHeight,
  };
}

/**
 * Checks, (resizes,) uploads straight to Storage with a signed URL, then
 * records the file in the media library. Throws an Error with a message
 * fit to show.
 */
export async function uploadMedia(
  kind: MediaKindName,
  original: File,
  altText: string,
  onStep: (step: UploadStep) => void = () => {},
): Promise<UploadedMedia> {
  // Type first; for images the size is checked after resizing.
  const typeProblem = uploadProblem(kind, {
    name: original.name,
    type: original.type,
    size: kind === "IMAGE" ? 1 : original.size,
  });
  if (typeProblem) throw new Error(typeProblem);
  if (kind === "IMAGE" && !altText.trim()) {
    throw new Error("Describe the image for people who can't see it.");
  }

  let file = original;
  let dimensions: { width?: number; height?: number } = {};
  if (kind === "IMAGE") {
    onStep("resizing");
    const prepared = await prepareImage(original);
    file = prepared.file;
    dimensions = { width: prepared.width, height: prepared.height };
    if (file.size > MEDIA_RULES.IMAGE.maxBytes) {
      throw new Error(
        `Even resized, that image is ${formatBytes(file.size)}. The limit is ${formatBytes(MEDIA_RULES.IMAGE.maxBytes)}.`,
      );
    }
  }
  const mimeType = kind === "CAPTIONS" ? "text/vtt" : file.type;

  onStep("uploading");
  const ticket = await createMediaUploadAction({
    kind,
    filename: file.name,
    mimeType,
    size: file.size,
  });
  if (!ticket.ok) throw new Error(ticket.error);
  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .uploadToSignedUrl(ticket.data.path, ticket.data.token, file, {
      contentType: mimeType,
    });
  if (error)
    throw new Error("The upload failed. Check your connection and try again.");

  onStep("saving");
  const saved = await registerMediaAction({
    kind,
    path: ticket.data.path,
    filename: original.name,
    mimeType,
    size: file.size,
    altText: altText.trim() || undefined,
    ...dimensions,
  });
  if (!saved.ok) throw new Error(saved.error);
  return saved.data;
}
