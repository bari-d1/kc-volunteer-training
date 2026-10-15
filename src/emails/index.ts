import type { ComponentType } from "react";
import TestEmail, { testEmailSubject, type TestEmailProps } from "./test-email";

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
};

export type EmailTemplateName = keyof typeof emailTemplates;
export type EmailTemplateProps<T extends EmailTemplateName> =
  (typeof emailTemplates)[T] extends Template<infer P> ? P : never;
