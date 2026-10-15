import { requireAdmin } from "@/lib/admin-auth";
import { csvRow, UTF8_BOM } from "@/lib/csv";
import { parseVolunteerFilters, STATUS_LABELS } from "@/lib/volunteer-status";
import { listVolunteerRows } from "@/server/admin/volunteers";

const HEADER = [
  "First name",
  "Last name",
  "Email",
  "Branch",
  "Team",
  "Status",
  "Modules completed",
  "Best quiz score",
  "Signed up",
  "Last active",
];

/** The volunteer list as CSV, with the same filters as the page. */
export async function GET(request: Request) {
  await requireAdmin();
  const filters = parseVolunteerFilters(new URL(request.url).searchParams);
  const rows = await listVolunteerRows(filters);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(UTF8_BOM + csvRow(HEADER)));
      for (const row of rows) {
        controller.enqueue(
          encoder.encode(
            csvRow([
              row.firstName,
              row.lastName,
              row.email,
              row.branchInterest ?? "Not sure yet",
              row.teamInterest ?? "",
              STATUS_LABELS[row.status],
              `${row.completedModules}/${row.totalModules}`,
              row.bestScore
                ? `${row.bestScore.score}/${row.bestScore.total}`
                : "",
              row.createdAt.toISOString().slice(0, 10),
              row.lastActive.toISOString().slice(0, 10),
            ]),
          ),
        );
      }
      controller.close();
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kc-volunteers-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
