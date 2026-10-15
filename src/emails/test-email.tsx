import { appUrl } from "@/lib/app-url";
import {
  EmailButton,
  EmailHeading,
  EmailText,
  KcEmailLayout,
} from "./_components/kc-email-layout";

export type TestEmailProps = { firstName?: string };

export const testEmailSubject = () => "KC Volunteers: test email";

/** Checks the email setup end to end. Safe to send to yourself. */
export default function TestEmail({ firstName = "there" }: TestEmailProps) {
  return (
    <KcEmailLayout preview="If you can read this, KC emails are working.">
      <EmailHeading>Hi {firstName},</EmailHeading>
      <EmailText>
        If you can read this, emails from KC Volunteers&apos; Onboarding are
        working.
      </EmailText>
      <EmailButton href={appUrl("/course")}>Open your training</EmailButton>
    </KcEmailLayout>
  );
}

TestEmail.PreviewProps = { firstName: "Ada" } satisfies TestEmailProps;
