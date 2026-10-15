/** Owner-only downloads (see src/app/api/certificates). */
export const certificatePdfHref = (number: string) =>
  `/api/certificates/${encodeURIComponent(number)}/pdf`;
export const certificateBadgeHref = (number: string) =>
  `/api/certificates/${encodeURIComponent(number)}/badge`;
/** The public verification page. */
export const certificateVerifyHref = (number: string) =>
  `/certificates/${encodeURIComponent(number)}`;

/** "15 October 2026", in UK time. */
export function formatCertificateDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}
