import { unsubscribeWithToken } from "@/server/email-preferences";

/**
 * One-click unsubscribe (RFC 8058) from the List-Unsubscribe header: mail
 * apps POST here and expect it to work without a confirm step.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const ok = await unsubscribeWithToken(token);
  return new Response(ok ? "Unsubscribed" : "Invalid or expired link", {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
