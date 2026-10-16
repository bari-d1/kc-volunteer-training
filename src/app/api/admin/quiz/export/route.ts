import { requireAdmin } from "@/lib/admin-auth";
import { exportQuestionBank } from "@/server/admin/quiz";

/**
 * The question bank as JSON, formatted like the file in the repo
 * (content/quizzes/<course>.json), so it can be committed back as is.
 */
export async function GET() {
  await requireAdmin();
  const bank = await exportQuestionBank();
  return new Response(`${JSON.stringify(bank, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${bank.courseSlug}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
