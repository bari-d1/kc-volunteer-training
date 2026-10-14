import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/blocks/sign-out-button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GuideSwitch } from "@/components/narrator/guide-switch";
import { requireVolunteer } from "@/lib/auth";
import { BRANCH_CODES, NOT_SURE } from "@/lib/schemas/onboarding";
import { getAccount } from "@/server/account";
import { getOnboardingOptions } from "@/server/profiles";
import { AccountForm } from "./account-form";
import { DeleteAccount } from "./delete-account";

export const metadata: Metadata = { title: "Your account" };

const branchLabels: Record<string, string> = {
  EXPERIENCE: "Experience",
  MINISTRY: "Ministry",
  CREATIVE: "Creative",
  SYSTEMS: "Systems",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" });

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-10 px-gutter py-16">
      <h1 className="text-h1">Your account</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const volunteer = await requireVolunteer("/account");
  const [{ profile, teamId }, options] = await Promise.all([
    getAccount(volunteer.id),
    getOnboardingOptions(),
  ]);

  const names = new Map(options.branches.map((b) => [b.code, b]));
  const branches = [
    ...BRANCH_CODES.map((code) => ({
      value: code,
      label: names.get(code)?.name ?? branchLabels[code],
      description: names.get(code)?.description,
    })),
    { value: NOT_SURE, label: "Not sure yet" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <Card header={<h2 className="text-h3">Your details</h2>} padding="lg">
        <dl className="mb-8 grid gap-4 text-body sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="text-label text-muted">Email</dt>
            <dd className="break-all">{profile.email}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-label text-muted">Joined</dt>
            <dd>{dateFormat.format(profile.createdAt)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-label text-muted">Consent given</dt>
            <dd>{dateFormat.format(profile.consentAt)}</dd>
          </div>
        </dl>
        <AccountForm
          branches={branches}
          teams={options.teams}
          initialValues={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            branchInterest: profile.branchInterest ?? NOT_SURE,
            teamId,
          }}
        />
      </Card>

      <Card header={<h2 className="text-h3">Your guide</h2>} padding="lg">
        <GuideSwitch initialHidden={profile.hideNarrator} />
      </Card>

      <Card header={<h2 className="text-h3">Your data</h2>} padding="lg">
        <div className="flex flex-col gap-4">
          <p className="text-body text-muted">
            Download a copy of everything we hold about you: your profile,
            training progress, quiz results and certificates.
          </p>
          <a
            href="/account/export"
            download
            className="inline-flex h-11 w-fit items-center rounded-pill border-2 border-lime px-6 font-bold text-lime transition-colors hover:bg-lime/10"
          >
            Download my data
          </a>
          <p className="text-small text-muted">
            See our{" "}
            <a
              href="/privacy"
              className="text-lime underline underline-offset-4"
            >
              privacy notice
            </a>{" "}
            for how we use it.
          </p>
        </div>
      </Card>

      <Card
        header={<h2 className="text-h3 text-danger">Delete account</h2>}
        padding="lg"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-muted">
            Permanently delete your account and everything linked to it.
          </p>
          <DeleteAccount />
        </div>
      </Card>

      <div className="flex justify-end">
        <SignOutButton />
      </div>
    </div>
  );
}
