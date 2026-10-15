import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { PillTag } from "@/components/ui/pill-tag";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCertificateDate,
  getPublicCertificate,
} from "@/server/certificates";

export const metadata: Metadata = {
  title: "Verify a certificate",
  // Verification is for people who were given a number, not for search.
  robots: { index: false, follow: false },
};

/**
 * Public: anyone with a certificate number can check it's genuine. Shows
 * the first name, last initial, course and date, and nothing else.
 */
export default function VerifyCertificatePage({
  params,
}: PageProps<"/certificates/[certificateNumber]">) {
  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-10 px-gutter py-16">
      <Logo className="h-12" priority />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
        <Verification params={params} />
      </Suspense>
    </main>
  );
}

async function Verification({
  params,
}: {
  params: Promise<{ certificateNumber: string }>;
}) {
  const { certificateNumber } = await params;
  const certificate = await getPublicCertificate(
    decodeURIComponent(certificateNumber).toUpperCase(),
  );

  if (!certificate) {
    return (
      <section className="flex flex-col gap-4 rounded-lg border-2 border-surface-2 bg-surface p-8">
        <PillTag>Verification</PillTag>
        <h1 className="text-h1">Certificate not found</h1>
        <p className="text-body-lg text-muted">
          We couldn&apos;t find a certificate with that number. Check it was
          typed exactly as shown, for example KC-2026-000123.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 rounded-lg border-2 border-lime bg-surface p-8">
      <PillTag>Verified certificate</PillTag>
      <h1 className="text-h1">{certificate.name}</h1>
      <p className="text-body-lg">
        completed <strong>{certificate.courseTitle}</strong> with Kingdom
        Culture.
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-label text-muted">Completed</dt>
          <dd className="text-body-lg font-bold">
            {formatCertificateDate(certificate.issuedAt)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label text-muted">Certificate number</dt>
          <dd className="text-body-lg font-bold">
            {certificate.certificateNumber}
          </dd>
        </div>
      </dl>
    </section>
  );
}
