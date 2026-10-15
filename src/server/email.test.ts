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
vi.mock("@/lib/prisma", () => ({
  prisma: { emailLog: { create: createLog } },
}));

const { sendEmail, formatFrom } = await import("./email");

const ENV = {
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "volunteers@kc.example",
  CONTACT_PHONE: "07700 900123",
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
    expect(message.html).toContain('href="tel:07700900123"');
    expect(message.text).toContain("07700 900123");
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

describe("email footer", () => {
  it("leaves out the phone line when no number is set", async () => {
    vi.stubEnv("CONTACT_PHONE", "");
    await sendEmail(testEmail);
    const { html } = send.mock.calls[0][0];
    expect(html).toContain("please don&#x27;t reply to this");
    expect(html).not.toContain("Call or text");
  });
});

describe("formatFrom", () => {
  it("names a bare address and keeps a full one", () => {
    expect(formatFrom("v@kc.example")).toBe("KC Volunteers <v@kc.example>");
    expect(formatFrom("KC Team <v@kc.example>")).toBe("KC Team <v@kc.example>");
  });
});
