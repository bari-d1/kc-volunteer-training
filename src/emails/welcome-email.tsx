import { appUrl } from "@/lib/app-url";
import {
  EmailButton,
  EmailHeading,
  EmailText,
  KcEmailLayout,
} from "./_components/kc-email-layout";

export type WelcomeEmailProps = {
  firstName: string;
  /** Lesson modules before the final quiz. */
  moduleCount: number;
};

export const welcomeEmailSubject = () => "Welcome to KC Volunteers' Onboarding";

/** Sent once, when a volunteer finishes /onboarding. */
export default function WelcomeEmail({
  firstName,
  moduleCount,
}: WelcomeEmailProps) {
  return (
    <KcEmailLayout preview="Your training is ready when you are.">
      <EmailHeading>Hi {firstName},</EmailHeading>
      <EmailText>
        Welcome, and thank you for saying yes to serving in Kingdom Culture!
        Your training covers who we are, what we believe and how we serve
        together: {moduleCount} short modules, then a quick quiz. It takes
        roughly 30 to 45 minutes, and you can do it in stages, since your
        progress saves as you go.
      </EmailText>
      <EmailButton href={appUrl("/course")}>Start your training</EmailButton>
    </KcEmailLayout>
  );
}

WelcomeEmail.PreviewProps = {
  firstName: "Ada",
  moduleCount: 10,
} satisfies WelcomeEmailProps;
