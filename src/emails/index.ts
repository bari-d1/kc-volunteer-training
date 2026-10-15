import type { ComponentType } from "react";
import CompletionEmail, {
  completionEmailSubject,
  type CompletionEmailProps,
} from "./completion-email";
import TestEmail, { testEmailSubject, type TestEmailProps } from "./test-email";
import WelcomeEmail, {
  welcomeEmailSubject,
  type WelcomeEmailProps,
} from "./welcome-email";

type Template<P> = {
  component: ComponentType<P>;
  subject: (props: P) => string;
};

/** Every email the app can send, by name. sendEmail looks templates up here. */
export const emailTemplates = {
  test: {
    component: TestEmail,
    subject: testEmailSubject,
  } satisfies Template<TestEmailProps>,
  welcome: {
    component: WelcomeEmail,
    subject: welcomeEmailSubject,
  } satisfies Template<WelcomeEmailProps>,
  completion: {
    component: CompletionEmail,
    subject: completionEmailSubject,
  } satisfies Template<CompletionEmailProps>,
};

export type EmailTemplateName = keyof typeof emailTemplates;
export type EmailTemplateProps<T extends EmailTemplateName> =
  (typeof emailTemplates)[T] extends Template<infer P> ? P : never;
