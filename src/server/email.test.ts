// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const createLog = vi.hoisted(() =>
  vi.fn<(args: { data: Record<string, unknown> }) => Promise<object>>(
    async () => ({}),
  ),
);
const findLog = vi.hoisted(() =>
  vi.fn<(args: unknown) => Promise<object | null>>(async () => null),
);
vi.mock("@/lib/prisma", () => ({
  prisma: { emailLog: { create: createLog, findFirst: findLog } },
}));

const { sendEmail, formatFrom } = await import("./email");

const ENV = {
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "volunteers@kc.example",
  APP_URL: "https://kc.example",
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value);
  vi.stubEnv("EMAIL_REDIRECT_TO", "");
  send.mockResolvedValue({ data: { id: "email_123" }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const testEmail = {
  to: "ada@example.org",
  template: "test" as const,
  props: { firstName: "Ada" },
  profileId: "11111111-1111-4111-8111-111111111111",
};

describe("sendEmail", () => {
  it("renders HTML and text and sends through Resend, then logs SENT", async () => {
    expect(
      await sendEmail({ ...testEmail, tags: { kind: "check up" } }),
    ).toEqual({ status: "SENT", resendId: "email_123" });
    const message = send.mock.calls[0][0];
    expect(message).toMatchObject({
      from: "KC Volunteers <volunteers@kc.example>",
      to: "ada@example.org",
      subject: "KC Volunteers: test email",
      tags: [
        { name: "template", value: "test" },
        { name: "kind", value: "check_up" },
      ],
    });
    expect(message.html).toContain("Hi <!-- -->Ada");
    expect(message.html).toContain('href="https://kc.example/course"');
    expect(message.html).toContain("background-color:#D9FF3D");
    expect(message.html).toContain(
      "Kingdom Culture, Jubilee Church Manchester (RCCG)",
    );
    expect(message).not.toHaveProperty("replyTo");
    expect(message.html).toContain("please don&#x27;t reply to this");
    expect(message.html).toContain("speak to your contact person");
    expect(message.text).toContain("speak to your contact person at KC");
    expect(message.text).toMatch(/Hi Ada/);
    expect(message.text).not.toContain("<");
    expect(createLog).toHaveBeenCalledWith({
      data: {
        profileId: testEmail.profileId,
        to: "ada@example.org",
        template: "test",
        status: "SENT",
        resendId: "email_123",
        error: null,
      },
    });
  });

  it("sends everything to EMAIL_REDIRECT_TO in development, naming the original", async () => {
    vi.stubEnv("EMAIL_REDIRECT_TO", "dev@kc.example");
    await sendEmail(testEmail);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "dev@kc.example",
      subject: "[DEV to ada@example.org] KC Volunteers: test email",
    });
    // The log keeps who it was really for.
    expect(createLog.mock.calls[0][0].data.to).toBe("ada@example.org");
  });

  it("logs SKIPPED and prints the email when there's no API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendEmail(testEmail)).toMatchObject({ status: "SKIPPED" });
    expect(send).not.toHaveBeenCalled();
    const printed = vi.mocked(console.info).mock.calls[0][0] as string;
    expect(printed).toContain("To: ada@example.org");
    expect(printed).toContain("Subject: KC Volunteers: test email");
    expect(printed).toContain("Hi Ada");
    expect(createLog.mock.calls[0][0].data).toMatchObject({
      status: "SKIPPED",
      resendId: null,
    });
  });

  it("doesn't throw when Resend rejects the email", async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "Invalid `to` field." },
    });
    expect(await sendEmail(testEmail)).toEqual({
      status: "FAILED",
      error: "Invalid `to` field.",
    });
    expect(createLog.mock.calls[0][0].data).toMatchObject({
      status: "FAILED",
      error: "Invalid `to` field.",
    });
  });

  it("doesn't throw when Resend itself crashes", async () => {
    send.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await sendEmail(testEmail)).toEqual({
      status: "FAILED",
      error: "socket hang up",
    });
  });

  it("doesn't throw when logging fails", async () => {
    createLog.mockRejectedValueOnce(new Error("database down"));
    expect(await sendEmail(testEmail)).toMatchObject({ status: "SENT" });
  });

  it("fails safely without a sender address", async () => {
    vi.stubEnv("EMAIL_FROM", "");
    expect(await sendEmail(testEmail)).toEqual({
      status: "FAILED",
      error: "EMAIL_FROM is not set",
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("sending once", () => {
  it("sends the first time and checks EmailLog for a SENT row", async () => {
    expect(await sendEmail({ ...testEmail, once: true })).toMatchObject({
      status: "SENT",
    });
    expect(findLog).toHaveBeenCalledWith({
      where: {
        profileId: testEmail.profileId,
        template: "test",
        status: "SENT",
      },
      select: { id: true },
    });
  });

  it("skips without sending or logging once it's been sent", async () => {
    findLog.mockResolvedValueOnce({ id: "log1" });
    expect(await sendEmail({ ...testEmail, once: true })).toEqual({
      status: "SKIPPED",
      alreadySent: true,
    });
    expect(send).not.toHaveBeenCalled();
    expect(createLog).not.toHaveBeenCalled();
  });

  it("doesn't risk a duplicate when the check fails", async () => {
    findLog.mockRejectedValueOnce(new Error("database down"));
    expect(await sendEmail({ ...testEmail, once: true })).toMatchObject({
      status: "FAILED",
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("welcome and completion emails", () => {
  it("welcomes the volunteer with what the training covers", async () => {
    await sendEmail({
      to: "ada@example.org",
      template: "welcome",
      props: { firstName: "Ada", moduleCount: 10 },
    });
    const message = send.mock.calls[0][0];
    expect(message.subject).toBe("Welcome to KC Volunteers' Onboarding");
    expect(message.text).toContain("Hi Ada");
    expect(message.text).toMatch(/10 short modules, then a quick quiz/);
    expect(message.text).toMatch(/30 to 45 minutes/);
    expect(message.text).toMatch(/do it in stages/);
    expect(message.html).toContain('href="https://kc.example/course"');
    expect(message.html).toContain("Start your training");
  });

  it("congratulates them with their certificate and next steps", async () => {
    await sendEmail({
      to: "ada@example.org",
      template: "completion",
      props: { firstName: "Ada", certificateNumber: "KC-2026-000123" },
    });
    const message = send.mock.calls[0][0];
    expect(message.subject).toBe("You're part of the family now, Ada!");
    expect(message.text).toContain("KC-2026-000123");
    expect(message.html).toContain(
      'href="https://kc.example/api/certificates/KC-2026-000123/pdf"',
    );
    expect(message.text).toMatch(/onboarding team will be in touch/);
    expect(message.html).not.toContain("WhatsApp");
  });

  it("adds the WhatsApp group when there's a link", async () => {
    await sendEmail({
      to: "ada@example.org",
      template: "completion",
      props: {
        firstName: "Ada",
        certificateNumber: "KC-2026-000123",
        whatsappUrl: "https://chat.whatsapp.com/abc",
      },
    });
    expect(send.mock.calls[0][0].html).toContain(
      'href="https://chat.whatsapp.com/abc"',
    );
  });
});

describe("reminder email", () => {
  it("shows progress, links to the next module and can be unsubscribed from", async () => {
    await sendEmail({
      to: "ada@example.org",
      template: "reminder",
      props: {
        firstName: "Ada",
        completedModules: 4,
        totalModules: 12,
        nextModuleTitle: "How We're Organised",
        continueUrl: "https://kc.example/course/kc/how-were-organised",
        unsubscribeUrl: "https://kc.example/email/unsubscribe?token=t",
      },
      headers: {
        "List-Unsubscribe":
          "<https://kc.example/api/email/unsubscribe?token=t>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    const message = send.mock.calls[0][0];
    expect(message.subject).toBe("Pick up where you left off, Ada");
    expect(message.text).toContain("You've finished 4 of 12 modules");
    expect(message.text).toContain("How We're Organised");
    expect(message.html).toContain(
      'href="https://kc.example/course/kc/how-were-organised"',
    );
    expect(message.html).toContain(
      'href="https://kc.example/email/unsubscribe?token=t"',
    );
    expect(message.headers).toEqual({
      "List-Unsubscribe": "<https://kc.example/api/email/unsubscribe?token=t>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("formatFrom", () => {
  it("names a bare address and keeps a full one", () => {
    expect(formatFrom("v@kc.example")).toBe("KC Volunteers <v@kc.example>");
    expect(formatFrom("KC Team <v@kc.example>")).toBe("KC Team <v@kc.example>");
  });
});
