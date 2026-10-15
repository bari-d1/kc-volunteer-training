/**
 * Pure helpers for scripts/configure-supabase-auth.ts: the settings we want,
 * how to merge them with the current config, and a readable diff.
 * Field names follow the Management API "update auth service config" reference.
 */

export type AuthConfig = Record<string, unknown>;

export const LOCAL_URL = "http://localhost:3000";

const subject = "Your KC Volunteers sign-in link";

/**
 * Digits in the sign-in code, typed on another device if the link is opened
 * elsewhere. Matches SIGN_IN_CODE_LENGTH in src/lib/sign-in-code.ts.
 */
export const OTP_LENGTH = 6;
/** Seconds the link and code stay valid. */
export const OTP_EXPIRY_SECONDS = 15 * 60;
/**
 * Sign-in emails per hour for the whole project. Supabase's default (2) is
 * for its built-in mailer; the app's own limit (3 per email per 10 minutes)
 * stops anyone flooding one address.
 */
export const EMAILS_PER_HOUR = 100;

/**
 * Inline-styled, image-free email used for magic link and signup
 * confirmation: a button for this device and a code for another one.
 */
export const emailTemplate = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#191919;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
        <tr>
          <td style="padding-bottom:16px;font-size:24px;font-weight:800;line-height:1.2;color:#ffffff;">Sign in to KC Volunteers' Onboarding</td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;font-size:16px;line-height:1.5;color:#ffffff;">Tap the button below to sign in. This link expires soon and can only be used once.</td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;">
            <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#D9FF3D;color:#191919;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:9999px;">Sign in</a>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:8px;font-size:14px;line-height:1.5;color:#ffffff;">Signing in on another device? Enter this code there:</td>
        </tr>
        <tr>
          <td style="padding-bottom:28px;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#D9FF3D;">{{ .Token }}</td>
        </tr>
        <tr>
          <td style="font-size:14px;line-height:1.5;color:#ffffff;">If you didn't ask for this, you can ignore this email.</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

export const TEMPLATE_FIELDS = [
  "mailer_subjects_magic_link",
  "mailer_templates_magic_link_content",
  "mailer_subjects_confirmation",
  "mailer_templates_confirmation_content",
] as const;

/** Splits a comma-separated allow list, trimming and dropping blanks. */
export function parseAllowList(value: unknown) {
  return typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

/** Keeps every existing entry and appends the ones we need, without duplicates. */
export function mergeAllowList(current: unknown, required: string[]) {
  const entries = parseAllowList(current);
  for (const entry of required)
    if (!entries.includes(entry)) entries.push(entry);
  return entries.join(",");
}

/**
 * Resend's SMTP relay. Until a domain is verified in Resend, it only sends
 * from onboarding@resend.dev, and only to the Resend account's own email.
 */
export const RESEND_SMTP = {
  host: "smtp.resend.com",
  port: "465",
  user: "resend",
  defaultFrom: "onboarding@resend.dev",
  defaultSenderName: "KC Volunteers",
};

export type SmtpOptions = {
  /** RESEND_API_KEY, used as the SMTP password. */
  apiKey: string;
  /** EMAIL_FROM: a sender on a domain verified in Resend. */
  from?: string;
  senderName?: string;
  /**
   * Supabase never returns the saved password (only a mask), so it's only
   * sent when none is saved yet, or when this is set (a new key).
   */
  updatePassword?: boolean;
};

/** Auth config fields for sending Supabase's emails through Resend. */
export function resendSmtpConfig({
  apiKey,
  from,
  senderName,
}: SmtpOptions): AuthConfig {
  return {
    smtp_host: RESEND_SMTP.host,
    smtp_port: RESEND_SMTP.port,
    smtp_user: RESEND_SMTP.user,
    smtp_pass: apiKey,
    smtp_admin_email: from || RESEND_SMTP.defaultFrom,
    smtp_sender_name: senderName || RESEND_SMTP.defaultSenderName,
  };
}

export function desiredConfig(
  current: AuthConfig,
  siteUrl: string,
  {
    skipTemplates = false,
    smtp,
  }: { skipTemplates?: boolean; smtp?: SmtpOptions } = {},
): AuthConfig {
  const site = siteUrl.replace(/\/+$/, "");
  const config: AuthConfig = {
    // Email sign-in on; volunteers sign up via magic link, so signups stay open.
    external_email_enabled: true,
    disable_signup: false,
    // Require confirmation: no auto-confirm, no sign-in before verifying.
    mailer_autoconfirm: false,
    mailer_allow_unverified_email_sign_ins: false,
    site_url: site,
    mailer_otp_length: OTP_LENGTH,
    mailer_otp_exp: OTP_EXPIRY_SECONDS,
    rate_limit_email_sent: EMAILS_PER_HOUR,
    uri_allow_list: mergeAllowList(current.uri_allow_list, [
      `${site}/**`,
      `${LOCAL_URL}/**`,
    ]),
  };
  if (smtp) {
    const { smtp_pass, ...rest } = resendSmtpConfig(smtp);
    Object.assign(config, rest);
    if (!current.smtp_pass || smtp.updatePassword) config.smtp_pass = smtp_pass;
  }
  if (!skipTemplates) {
    // First-time magic-link users get the confirmation email, so both match.
    Object.assign(config, {
      mailer_subjects_magic_link: subject,
      mailer_templates_magic_link_content: emailTemplate,
      mailer_subjects_confirmation: subject,
      mailer_templates_confirmation_content: emailTemplate,
    });
  }
  return config;
}

export type Change = { field: string; from: unknown; to: unknown };

/** Fields whose value would change. */
export function diffConfig(current: AuthConfig, desired: AuthConfig): Change[] {
  return Object.entries(desired)
    .filter(([field, to]) => (current[field] ?? null) !== to)
    .map(([field, to]) => ({ field, from: current[field] ?? null, to }));
}

/**
 * One readable line per change; long templates are summarised, not dumped,
 * and the SMTP password is never shown.
 */
export function formatChange({ field, from, to }: Change) {
  if (field === "smtp_pass") return `${field}: set (hidden)`;
  if (field === "uri_allow_list") {
    const before = parseAllowList(from);
    const added = parseAllowList(to).filter((entry) => !before.includes(entry));
    return `${field}: + ${added.join(", ")}`;
  }
  if (field.startsWith("mailer_templates_")) {
    const length = (value: unknown) =>
      typeof value === "string" ? value.length : 0;
    return `${field}: replaced (${length(from)} → ${length(to)} characters)`;
  }
  return `${field}: ${JSON.stringify(from)} → ${JSON.stringify(to)}`;
}
