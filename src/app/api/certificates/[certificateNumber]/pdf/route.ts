import {
  certificateOrError,
  PRIVATE_HEADERS,
} from "@/server/certificate-access";
import { renderCertificatePdf } from "@/server/certificate-pdf";

/** The volunteer's certificate as an A4 PDF. Owner or admin only. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/certificates/[certificateNumber]/pdf">,
) {
  const { certificateNumber } = await ctx.params;
  const certificate = await certificateOrError(certificateNumber);
  if (certificate instanceof Response) return certificate;

  const pdf = await renderCertificatePdf(certificate);
  return new Response(new Uint8Array(pdf), {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificateNumber}.pdf"`,
    },
  });
}
