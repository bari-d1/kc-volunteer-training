import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

/**
 * The signed-in Supabase user, or null. Verifies the JWT (getClaims), so it's
 * safe for authorisation. Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: String(claims.email ?? "") };
});

/** The Profile row for a user id, or null. Cached per request. */
export const getProfile = cache((userId: string) =>
  prisma.profile.findUnique({ where: { id: userId } }),
);

/**
 * The signed-in volunteer's Profile. Redirects to /sign-in when signed out
 * and to /onboarding when they haven't created a profile yet.
 */
export async function requireVolunteer(next = "/course") {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);

  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");

  return profile;
}
