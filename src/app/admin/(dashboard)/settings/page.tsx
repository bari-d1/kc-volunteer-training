import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { getQuizBankStatus, getSiteSettings } from "@/server/admin/settings";
import {
  EmailSettingsForm,
  LinksSettingsForm,
  QuizSettingsForm,
  SafeguardingSettingsForm,
} from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await requireAdmin();
  const [settings, bank] = await Promise.all([
    getSiteSettings(),
    getQuizBankStatus(),
  ]);
  const envDigestCount = (process.env.ADMIN_DIGEST_TO ?? "")
    .split(",")
    .filter((a) => a.trim()).length;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Changes take effect straight away for everyone."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <SafeguardingSettingsForm
          initial={{
            email: settings.safeguarding?.email ?? "",
            contacts: settings.safeguarding?.contacts ?? [
              { label: "", name: "" },
            ],
            incidentFormUrl: settings.links?.incidentFormUrl ?? "",
          }}
        />
        <div className="flex flex-col gap-6">
          <LinksSettingsForm initial={settings.links?.whatsappUrl ?? ""} />
          <QuizSettingsForm
            initial={settings.quiz ?? { passMark: 80, questionsPerAttempt: 10 }}
            bank={bank}
          />
          <EmailSettingsForm
            initial={
              settings.emails ?? {
                remindersEnabled: true,
                digestRecipients: [],
              }
            }
            envDigestCount={envDigestCount}
          />
        </div>
      </div>
    </>
  );
}
