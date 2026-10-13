import { requireVolunteer } from "@/lib/auth";
import { exportAccountData } from "@/server/account";

/** "Download my data": a JSON copy of everything we hold about the volunteer. */
export async function GET() {
  const profile = await requireVolunteer("/account");
  const data = await exportAccountData(profile.id);
  const date = data.exportedAt.slice(0, 10);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kc-volunteer-data-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
