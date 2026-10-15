import {
  EmailButton,
  EmailHeading,
  EmailText,
  KcEmailLayout,
} from "./_components/kc-email-layout";

export type ReminderEmailProps = {
  firstName: string;
  completedModules: number;
  totalModules: number;
  nextModuleTitle: string;
  /** Absolute link straight to the next module. */
  continueUrl: string;
  /** Absolute link to /email/unsubscribe?token=… */
  unsubscribeUrl: string;
};

export const reminderEmailSubject = ({ firstName }: ReminderEmailProps) =>
  `Pick up where you left off, ${firstName}`;

/** Sent after a week (and again after three) without progress. */
export default function ReminderEmail({
  firstName,
  completedModules,
  totalModules,
  nextModuleTitle,
  continueUrl,
  unsubscribeUrl,
}: ReminderEmailProps) {
  return (
    <KcEmailLayout
      preview={`Next up: ${nextModuleTitle}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailHeading>Hi {firstName},</EmailHeading>
      <EmailText>
        Your volunteer training is waiting for you.{" "}
        {completedModules === 0
          ? `There are ${totalModules} short modules, and you can do them in stages.`
          : `You've finished ${completedModules} of ${totalModules} modules, so you're well on your way.`}
      </EmailText>
      <EmailText>
        Next up: <strong>{nextModuleTitle}</strong>
      </EmailText>
      <EmailButton href={continueUrl}>Continue training</EmailButton>
    </KcEmailLayout>
  );
}

ReminderEmail.PreviewProps = {
  firstName: "Ada",
  completedModules: 4,
  totalModules: 12,
  nextModuleTitle: "How We're Organised",
  continueUrl:
    "http://localhost:3000/course/volunteers-onboarding/how-were-organised",
  unsubscribeUrl: "http://localhost:3000/email/unsubscribe?token=preview",
} satisfies ReminderEmailProps;
