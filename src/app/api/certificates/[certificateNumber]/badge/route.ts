import {
  certificateOrError,
  PRIVATE_HEADERS,
} from "@/server/certificate-access";
import { renderCertificateBadge } from "@/server/certificate-badge";

/** A square PNG badge to share. Owner or admin only. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/certificates/[certificateNumber]/badge">,
) {
  const { certificateNumber } = await ctx.params;
  const certificate = await certificateOrError(certificateNumber);
  if (certificate instanceof Response) return certificate;

  return renderCertificateBadge(certificate, {
    ...PRIVATE_HEADERS,
    "Content-Disposition": `inline; filename="${certificate.certificateNumber}-badge.png"`,
  });
}
