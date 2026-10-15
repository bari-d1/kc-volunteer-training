import "server-only";
import {
  getCertificateForDownload,
  type CertificateDetails,
} from "./certificates";

const STATUS = { unauthorised: 401, forbidden: 403, "not-found": 404 } as const;
const MESSAGE = {
  unauthorised: "Sign in to download this certificate.",
  forbidden: "You can only download your own certificate.",
  "not-found": "Certificate not found.",
} as const;

/** Never cache a personal file in a shared cache. */
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

/**
 * For the PDF and badge routes: the certificate when the requester is its
 * owner or an admin, otherwise a plain-text 401, 403 or 404 response.
 */
export async function certificateOrError(
  certificateNumber: string,
): Promise<CertificateDetails | Response> {
  const result = await getCertificateForDownload(certificateNumber);
  if (result.status === "ok") return result.certificate;
  return new Response(MESSAGE[result.status], {
    status: STATUS[result.status],
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
