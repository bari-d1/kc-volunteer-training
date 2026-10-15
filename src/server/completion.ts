import "server-only";
import type { BranchCode } from "@/generated/prisma/client";
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ColourToken } from "@/lib/schemas/common";
import { LinksSettingSchema } from "@/lib/schemas/site-settings";

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

/** The volunteers' WhatsApp group from SiteSetting "links", if set. */
export async function getWhatsappUrl() {
  const row = await prisma.siteSetting.findUnique({ where: { key: "links" } });
  const parsed = LinksSettingSchema.safeParse(row?.value);
  return parsed.success ? parsed.data.whatsappUrl : null;
}

const BRANCH_COLOURS: Record<BranchCode, ColourToken> = {
  EXPERIENCE: "experience",
  MINISTRY: "ministry",
  CREATIVE: "creative",
  SYSTEMS: "systems",
};

export type Placement = {
  branchName: string;
  branchDescription: string;
  colour: ColourToken;
  /** Null when they picked a branch but not a team. */
  teamName: string | null;
  leads: Array<{ name: string; role: string }>;
};

/**
 * The branch and team the volunteer chose at onboarding, with the branch's
 * active leads. Null when they chose "Not sure yet".
 */
export async function getPlacement(profile: {
  branchInterest: BranchCode | null;
  teamInterest: string | null;
}): Promise<Placement | null> {
  if (!profile.branchInterest) return null;
  const branch = await prisma.branch.findUnique({
    where: { code: profile.branchInterest },
    select: {
      name: true,
      description: true,
      leaders: {
        where: { group: "BRANCH_LEAD", isActive: true },
        orderBy: { order: "asc" },
        select: { name: true, role: true },
      },
    },
  });
  if (!branch) return null;
  return {
    branchName: branch.name,
    branchDescription: branch.description,
    colour: BRANCH_COLOURS[profile.branchInterest],
    teamName: profile.teamInterest,
    leads: branch.leaders,
  };
}
