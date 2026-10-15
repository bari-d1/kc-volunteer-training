import { describe, expect, it } from "vitest";
import {
  desiredConfig,
  diffConfig,
  emailTemplate,
  formatChange,
  mergeAllowList,
  resendSmtpConfig,
} from "./supabase-auth-config";

describe("mergeAllowList", () => {
  it("keeps existing entries and adds missing ones once", () => {
    expect(
      mergeAllowList(
        "http://localhost:3000/auth/confirm**, https://old.example.com/**",
        [
          "https://kc.example.org/**",
          "http://localhost:3000/**",
          "https://old.example.com/**",
        ],
      ),
    ).toBe(
      "http://localhost:3000/auth/confirm**,https://old.example.com/**,https://kc.example.org/**,http://localhost:3000/**",
    );
  });

  it("handles an empty or missing list", () => {
    expect(mergeAllowList("", ["a"])).toBe("a");
    expect(mergeAllowList(undefined, ["a"])).toBe("a");
  });
});

describe("desiredConfig", () => {
  it("requires email confirmation and sets the site URL and allow list", () => {
    const config = desiredConfig(
      { uri_allow_list: "" },
      "https://kc.example.org/",
    );
    expect(config).toMatchObject({
      external_email_enabled: true,
      disable_signup: false,
      mailer_autoconfirm: false,
      mailer_allow_unverified_email_sign_ins: false,
      site_url: "https://kc.example.org",
      uri_allow_list: "https://kc.example.org/**,http://localhost:3000/**",
      mailer_subjects_magic_link: "Your KC Volunteers sign-in link",
      mailer_subjects_confirmation: "Your KC Volunteers sign-in link",
    });
    expect(config.mailer_templates_confirmation_content).toBe(
      config.mailer_templates_magic_link_content,
    );
  });

  it("omits templates with skipTemplates", () => {
    const config = desiredConfig({}, "http://localhost:3000", {
      skipTemplates: true,
    });
    expect(
      Object.keys(config).some((k) => k.startsWith("mailer_templates_")),
    ).toBe(false);
    expect(config).not.toHaveProperty("mailer_subjects_magic_link");
  });
});

describe("Resend SMTP", () => {
  it("sends through Resend from onboarding@resend.dev by default", () => {
    const config = desiredConfig({}, "http://localhost:3000", {
      smtp: { apiKey: "re_secret" },
    });
    expect(config).toMatchObject({
      smtp_host: "smtp.resend.com",
      smtp_port: "465",
      smtp_user: "resend",
      smtp_pass: "re_secret",
      smtp_admin_email: "onboarding@resend.dev",
      smtp_sender_name: "KC Volunteers",
    });
  });

  it("uses EMAIL_FROM once a domain is verified", () => {
    expect(
      resendSmtpConfig({ apiKey: "re_secret", from: "hello@example.org" }),
    ).toMatchObject({ smtp_admin_email: "hello@example.org" });
  });

  it("leaves SMTP alone without a key", () => {
    expect(desiredConfig({}, "http://localhost:3000")).not.toHaveProperty(
      "smtp_host",
    );
  });

  it("never prints the password", () => {
    const line = formatChange({
      field: "smtp_pass",
      from: null,
      to: "re_secret",
    });
    expect(line).toBe("smtp_pass: set (hidden)");
    expect(line).not.toContain("re_secret");
  });
});

describe("emailTemplate", () => {
  it("links to the token_hash confirm route and has the agreed copy", () => {
    expect(emailTemplate).toContain(
      'href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"',
    );
    for (const text of [
      "Sign in to KC Volunteers' Onboarding",
      "Tap the button below to sign in. This link expires soon and can only be used once.",
      ">Sign in</a>",
      "If you didn't ask for this, you can ignore this email.",
      "background:#191919",
      "background:#D9FF3D;color:#191919",
    ]) {
      expect(emailTemplate).toContain(text);
    }
    expect(emailTemplate).not.toMatch(/<img/i);
    expect(emailTemplate.match(/<a /g)).toHaveLength(1);
  });
});

describe("diffConfig", () => {
  it("lists only changed fields, readably", () => {
    const current = {
      site_url: "http://localhost:3000",
      uri_allow_list: "http://localhost:3000/auth/confirm**",
      mailer_autoconfirm: false,
      mailer_templates_magic_link_content: "<p>old</p>",
    };
    const changes = diffConfig(
      current,
      desiredConfig(current, "http://localhost:3000"),
    );
    const lines = changes.map(formatChange);

    expect(changes.map((c) => c.field)).not.toContain("site_url");
    expect(changes.map((c) => c.field)).not.toContain("mailer_autoconfirm");
    expect(lines).toContain("uri_allow_list: + http://localhost:3000/**");
    expect(
      lines.find((l) => l.startsWith("mailer_templates_magic_link_content")),
    ).toMatch(/replaced \(10 → \d+ characters\)/);
  });

  it("is empty once applied", () => {
    const applied = desiredConfig({}, "http://localhost:3000");
    expect(
      diffConfig(applied, desiredConfig(applied, "http://localhost:3000")),
    ).toEqual([]);
  });
});
