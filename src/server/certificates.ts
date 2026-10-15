import "server-only";
import { isAdmin } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCertificateNumber } from "./certificate-number";

export { formatCertificateDate } from "@/lib/certificate-links";

export type CertificateDetails = {
  certificateNumber: string;
  firstName: string;
  lastName: string;
  courseTitle: string;
  issuedAt: Date;
};

async function findCertificate(certificateNumber: string) {
  if (!isCertificateNumber(certificateNumber)) return null;
  return prisma.certificate.findUnique({
    where: { certificateNumber },
    select: {
      certificateNumber: true,
      profileId: true,
      issuedAt: true,
      profile: { select: { firstName: true, lastName: true } },
      course: { select: { title: true } },
    },
  });
}

/**
 * A certificate for the PDF and badge downloads: only its owner or a
 * signed-in admin gets the details.
 */
export async function getCertificateForDownload(
  certificateNumber: string,
): Promise<
  | { status: "ok"; certificate: CertificateDetails }
  | { status: "not-found" | "unauthorised" | "forbidden" }
> {
  const [user, admin] = await Promise.all([getCurrentUser(), isAdmin()]);
  if (!user && !admin) return { status: "unauthorised" };

  const row = await findCertificate(certificateNumber);
  if (!row) return { status: "not-found" };
  if (!admin && row.profileId !== user?.id) return { status: "forbidden" };

  return {
    status: "ok",
    certificate: {
      certificateNumber: row.certificateNumber,
      firstName: row.profile.firstName,
      lastName: row.profile.lastName,
      courseTitle: row.course.title,
      issuedAt: row.issuedAt,
    },
  };
}

export type PublicCertificate = {
  certificateNumber: string;
  /** First name and last initial only, e.g. "Ada L." */
  name: string;
  courseTitle: string;
  issuedAt: Date;
};

/** What anyone with the number can verify. Never includes the email. */
export async function getPublicCertificate(
  certificateNumber: string,
): Promise<PublicCertificate | null> {
  const row = await findCertificate(certificateNumber);
  if (!row) return null;
  const initial = row.profile.lastName.trim().charAt(0).toUpperCase();
  return {
    certificateNumber: row.certificateNumber,
    name: initial
      ? `${row.profile.firstName} ${initial}.`
      : row.profile.firstName,
    courseTitle: row.course.title,
    issuedAt: row.issuedAt,
  };
}
