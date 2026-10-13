import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { hasProfile } from "@/server/profiles";

/**
 * Magic-link landing. Handles the token_hash link from our email template,
 * and falls back to a PKCE ?code= link from Supabase's default template.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  let userId: string | undefined;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id;
  }

  if (!userId) {
    return redirectTo(
      request,
      `/sign-in?error=link&next=${encodeURIComponent(next)}`,
    );
  }

  return redirectTo(request, (await hasProfile(userId)) ? next : "/onboarding");
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin));
}
