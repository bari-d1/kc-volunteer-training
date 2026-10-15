import { appUrl } from "@/lib/app-url";
import {
  EmailButton,
  EmailHeading,
  EmailNote,
  EmailText,
  KcEmailLayout,
} from "./_components/kc-email-layout";

export type CompletionEmailProps = {
  firstName: string;
  certificateNumber: string;
  /** The volunteers' WhatsApp group, when one is set in SiteSetting. */
  whatsappUrl?: string | null;
};

export const completionEmailSubject = ({ firstName }: CompletionEmailProps) =>
  `You're part of the family now, ${firstName}!`;

/** Sent once, when a volunteer passes the final quiz. */
export default function CompletionEmail({
  firstName,
  certificateNumber,
  whatsappUrl,
}: CompletionEmailProps) {
  return (
    <KcEmailLayout preview="You've completed your training. Welcome to KC!">
      <EmailHeading>Congratulations, {firstName}!</EmailHeading>
      <EmailText>
        You&apos;ve completed Volunteers&apos; Onboarding. Welcome to the KC
        volunteer family!
      </EmailText>
      <EmailText>
        Your certificate number is <strong>{certificateNumber}</strong>.
      </EmailText>
      <EmailButton
        href={appUrl(
          `/api/certificates/${encodeURIComponent(certificateNumber)}/pdf`,
        )}
      >
        Download your certificate
      </EmailButton>
      <EmailNote>You&apos;ll be asked to sign in first.</EmailNote>
      {whatsappUrl && (
        <EmailButton href={whatsappUrl} variant="secondary">
          Join the volunteers&apos; WhatsApp group
        </EmailButton>
      )}
      <EmailText>
        <strong>What happens next:</strong> a member of the KC onboarding team
        will be in touch with you directly to welcome you and help you get
        started.
      </EmailText>
    </KcEmailLayout>
  );
}

CompletionEmail.PreviewProps = {
  firstName: "Ada",
  certificateNumber: "KC-2026-000123",
  whatsappUrl: null,
} satisfies CompletionEmailProps;
