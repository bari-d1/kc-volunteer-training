import "server-only";
import { createElement, type ComponentType } from "react";
import { render } from "react-email";
import { Resend } from "resend";
import type { EmailStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  emailTemplates,
  type EmailTemplateName,
  type EmailTemplateProps,
} from "@/emails";

const DEFAULT_SENDER_NAME = "KC Volunteers";

export type SendEmailInput<T extends EmailTemplateName> = {
  to: string;
  template: T;
  props: EmailTemplateProps<T>;
  /** Resend tags, e.g. { kind: "certificate" }. Letters, numbers, _ and - only. */
  tags?: Record<string, string>;
  /** The volunteer it's for, for the EmailLog. */
  profileId?: string;
};

export type SendEmailResult = {
  status: EmailStatus;
  resendId?: string;
  error?: string;
};

/** EMAIL_FROM may be a bare address or "Name <address>". */
export function formatFrom(value: string) {
  return value.includes("<") ? value : `${DEFAULT_SENDER_NAME} <${value}>`;
}

/** Resend only accepts ASCII letters, numbers, underscores and dashes in tags. */
function toResendTags(tags: Record<string, string> = {}) {
  const clean = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "_");
  return Object.entries(tags).map(([name, value]) => ({
    name: clean(name),
    value: clean(value),
  }));
}

/**
 * Renders a template to HTML and plain text and sends it through Resend from
 * EMAIL_FROM, replying to EMAIL_REPLY_TO. Never throws: failures are logged
 * and recorded in EmailLog, and the caller's request carries on.
 *
 * In development, EMAIL_REDIRECT_TO sends everything to that address instead,
 * with "[DEV to <original>]" in front of the subject. Without
 * RESEND_API_KEY nothing is sent: the email is printed and logged SKIPPED.
 */
export async function sendEmail<T extends EmailTemplateName>({
  to,
  template,
  props,
  tags,
  profileId,
}: SendEmailInput<T>): Promise<SendEmailResult> {
  let result: SendEmailResult;
  try {
    result = await deliver({ to, template, props, tags });
  } catch (error) {
    console.error(`Email "${template}" failed`, error);
    result = {
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    await prisma.emailLog.create({
      data: {
        profileId: profileId ?? null,
        to,
        template,
        status: result.status,
        resendId: result.resendId ?? null,
        error: result.error ?? null,
      },
    });
  } catch (error) {
    console.error(`Couldn't log email "${template}"`, error);
  }
  return result;
}

async function deliver<T extends EmailTemplateName>({
  to,
  template,
  props,
  tags,
}: Omit<SendEmailInput<T>, "profileId">): Promise<SendEmailResult> {
  // Each template's props match its own entry (checked by SendEmailInput).
  const { component, subject: subjectFor } = emailTemplates[template] as {
    component: ComponentType<object>;
    subject: (props: object) => string;
  };
  const templateProps = props as object;
  const element = createElement(component, templateProps);
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  const redirectTo = process.env.EMAIL_REDIRECT_TO?.trim();
  const recipient = redirectTo || to;
  const subject = redirectTo
    ? `[DEV to ${to}] ${subjectFor(templateProps)}`
    : subjectFor(templateProps);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(
      [
        `Email "${template}" not sent (no RESEND_API_KEY)`,
        `To: ${recipient}`,
        `Subject: ${subject}`,
        "",
        text,
      ].join("\n"),
    );
    return { status: "SKIPPED", error: "RESEND_API_KEY is not set" };
  }

  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");

  const { data, error } = await new Resend(apiKey).emails.send({
    from: formatFrom(from),
    to: recipient,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    subject,
    html,
    text,
    tags: toResendTags({ template, ...tags }),
  });
  if (error || !data) {
    const message = error?.message ?? "Resend returned no id";
    console.error(`Email "${template}" was rejected by Resend: ${message}`);
    return { status: "FAILED", error: message };
  }
  return { status: "SENT", resendId: data.id };
}
