import "server-only";
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** The last module, shown once the quiz is passed. */
export const COMPLETION_SLUG = "part-of-the-family";

export type EarnedCertificate = { certificateNumber: string; issuedAt: Date };

/** The volunteer's certificate for the course: proof they passed the quiz. */
export function getCertificate(
  profileId: VolunteerId,
  courseId: string,
): Promise<EarnedCertificate | null> {
  return prisma.certificate.findUnique({
    where: { profileId_courseId: { profileId, courseId } },
    select: { certificateNumber: true, issuedAt: true },
  });
}
