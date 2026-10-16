/**
 * Creates (or updates) the public "course-media" Storage bucket for
 * uploaded images, videos and captions.
 *
 * Usage: pnpm storage:setup
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and
 * SUPABASE_SECRET_KEY (.env).
 */
import "dotenv/config";
import { MEDIA_BUCKET, MEDIA_RULES } from "@/lib/media-upload";
import { createAdminClient } from "@/lib/supabase/admin";

const options = {
  // Public: files are read by URL; the paths are unguessable.
  public: true,
  // The largest kind (videos). Each kind's own limit is checked in the app.
  fileSizeLimit: Math.max(...Object.values(MEDIA_RULES).map((r) => r.maxBytes)),
  allowedMimeTypes: [
    ...new Set(
      Object.values(MEDIA_RULES)
        .flatMap((r) => r.mimeTypes)
        .filter((t) => t && t !== "application/octet-stream"),
    ),
  ],
};

async function main() {
  const storage = createAdminClient().storage;
  const { data: existing } = await storage.getBucket(MEDIA_BUCKET);
  const { error } = existing
    ? await storage.updateBucket(MEDIA_BUCKET, options)
    : await storage.createBucket(MEDIA_BUCKET, options);
  if (error) throw error;
  console.log(
    `${existing ? "Updated" : "Created"} public bucket "${MEDIA_BUCKET}" (max ${options.fileSizeLimit / 1024 / 1024} MB; ${options.allowedMimeTypes.join(", ")}).`,
  );
}

main().catch((error) => {
  console.error(`✗ ${error.message ?? error}`);
  process.exitCode = 1;
});
