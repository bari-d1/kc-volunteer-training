import { Button } from "@/components/ui/button";
import { PillTag } from "@/components/ui/pill-tag";
import {
  certificateBadgeHref,
  certificatePdfHref,
  formatCertificateDate,
} from "@/lib/certificate-links";
import { cn } from "@/lib/cn";

/** The volunteer's certificate with its downloads. */
export function CertificateCard({
  certificateNumber,
  issuedAt,
  headingLevel: Heading = "h2",
  className,
}: {
  certificateNumber: string;
  issuedAt: Date;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  return (
    <section
      aria-label="Your certificate"
      className={cn(
        "flex flex-col gap-6 rounded-lg border-2 border-lime bg-surface p-6 md:p-8",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <PillTag>Certificate of completion</PillTag>
        <Heading className="text-h3">Volunteers&apos; Onboarding</Heading>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-label text-muted">Certificate number</dt>
          <dd className="text-body-lg font-bold tabular-nums">
            {certificateNumber}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label text-muted">Completed</dt>
          <dd className="text-body-lg font-bold">
            {formatCertificateDate(issuedAt)}
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* download + no prefetch: these are files, not pages. */}
        <Button
          size="lg"
          href={certificatePdfHref(certificateNumber)}
          prefetch={false}
          download
          className="w-full sm:w-fit"
        >
          Download PDF
        </Button>
        <Button
          variant="secondary"
          size="lg"
          href={certificateBadgeHref(certificateNumber)}
          prefetch={false}
          download
          className="w-full sm:w-fit"
        >
          Share badge
        </Button>
      </div>
    </section>
  );
}
