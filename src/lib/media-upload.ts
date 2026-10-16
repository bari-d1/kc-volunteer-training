/** The public Supabase Storage bucket for course images, videos and captions. */
export const MEDIA_BUCKET = "course-media";

export type MediaKindName = "IMAGE" | "VIDEO" | "CAPTIONS";

const MB = 1024 * 1024;

/** What each kind accepts, by MIME type and extension, and how big. */
export const MEDIA_RULES: Record<
  MediaKindName,
  {
    label: string;
    mimeTypes: string[];
    extensions: string[];
    maxBytes: number;
  }
> = {
  IMAGE: {
    label: "image",
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    extensions: ["jpg", "jpeg", "png", "webp"],
    maxBytes: 5 * MB,
  },
  VIDEO: {
    label: "video",
    mimeTypes: ["video/mp4"],
    extensions: ["mp4"],
    // Supabase's free plan caps every file at 50 MB (Storage settings).
    maxBytes: 50 * MB,
  },
  CAPTIONS: {
    label: "captions file",
    // Browsers report .vtt inconsistently, so the extension decides.
    mimeTypes: ["text/vtt", "text/plain", "application/octet-stream", ""],
    extensions: ["vtt"],
    maxBytes: 1 * MB,
  },
};

/** Images wider than this are resized (and turned into WebP) before upload. */
export const MAX_IMAGE_WIDTH = 2000;

export const extensionOf = (filename: string) =>
  filename.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

export function formatBytes(bytes: number) {
  if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Why a file can't be uploaded as this kind, or null if it can. */
export function uploadProblem(
  kind: MediaKindName,
  file: { name: string; type: string; size: number },
): string | null {
  const rules = MEDIA_RULES[kind];
  const extension = extensionOf(file.name);
  const typeOk =
    rules.extensions.includes(extension) &&
    (kind === "CAPTIONS" || rules.mimeTypes.includes(file.type));
  if (!typeOk) {
    return `That isn't a supported ${rules.label}. Use ${rules.extensions
      .filter((e) => e !== "jpeg")
      .map((e) => `.${e}`)
      .join(", ")}.`;
  }
  if (file.size <= 0) return "That file is empty.";
  if (file.size > rules.maxBytes) {
    return `That ${rules.label} is ${formatBytes(file.size)}. The limit is ${formatBytes(rules.maxBytes)}.`;
  }
  return null;
}

/** "Our Team (1).JPG" → "our-team-1.jpg": safe in a URL. */
export function safeFilename(filename: string) {
  const extension = extensionOf(filename);
  const base = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "file"}${extension ? `.${extension}` : ""}`;
}

/** {yyyy}/{mm}/{uuid}-{safe-filename}: unguessable, and tidy by month. */
export function storagePath(filename: string, uuid: string, now = new Date()) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${uuid}-${safeFilename(filename)}`;
}
