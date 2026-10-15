import "server-only";
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

/** Profile.emailReminders, from the /account switch. */
export async function setEmailReminders(profileId: VolunteerId, on: boolean) {
  await prisma.profile.update({
    where: { id: profileId },
    data: { emailReminders: on },
  });
}

/**
 * Turns reminders off for the volunteer named in an unsubscribe token.
 * False if the token is invalid or the profile no longer exists.
 */
export async function unsubscribeWithToken(token: string | null | undefined) {
  const profileId = await verifyUnsubscribeToken(token);
  if (!profileId) return false;
  const { count } = await prisma.profile.updateMany({
    where: { id: profileId },
    data: { emailReminders: false },
  });
  return count === 1;
}
