import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Run after() callbacks straight away, and keep the promise to await.
const pending: Promise<unknown>[] = [];
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => pending.push(task()),
}));
const settle = () => Promise.all(pending.splice(0));

const sendEmail = vi.hoisted(() => vi.fn(async () => ({ status: "SENT" })));
vi.mock("./email", () => ({ sendEmail }));

const prisma = vi.hoisted(() => ({
  profile: { findUniqueOrThrow: vi.fn() },
  course: { findUnique: vi.fn() },
  module: { findMany: vi.fn() },
  certificate: { findUniqueOrThrow: vi.fn() },
  siteSetting: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const { sendWelcomeEmail, sendCompletionEmail } =
  await import("./notifications");

const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  prisma.profile.findUniqueOrThrow.mockResolvedValue({
    email: "ada@example.org",
    firstName: "Ada",
  });
  prisma.course.findUnique.mockResolvedValue({ id: "c1" });
  prisma.module.findMany.mockResolvedValue([
    { slug: "welcome", order: 0 },
    { slug: "about-kc", order: 1 },
    { slug: "final-quiz", order: 2 },
    { slug: "part-of-the-family", order: 3 },
  ]);
  prisma.certificate.findUniqueOrThrow.mockResolvedValue({
    certificateNumber: "KC-2026-000007",
  });
  prisma.siteSetting.findUnique.mockResolvedValue({
    value: { incidentFormUrl: "https://forms.example.org/x" },
  });
});

describe("sendWelcomeEmail", () => {
  it("sends once, counting the lesson modules before the quiz", async () => {
    sendWelcomeEmail(ID);
    await settle();
    expect(sendEmail).toHaveBeenCalledWith({
      to: "ada@example.org",
      template: "welcome",
      props: { firstName: "Ada", moduleCount: 2 },
      profileId: ID,
      once: true,
      tags: { kind: "welcome" },
    });
  });

  it("never throws if loading fails", async () => {
    prisma.profile.findUniqueOrThrow.mockRejectedValue(new Error("gone"));
    sendWelcomeEmail(ID);
    await expect(settle()).resolves.toBeDefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("sendCompletionEmail", () => {
  it("sends once with the certificate number and no WhatsApp link yet", async () => {
    sendCompletionEmail(ID, "c1");
    await settle();
    expect(prisma.certificate.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId_courseId: { profileId: ID, courseId: "c1" } },
      }),
    );
    expect(sendEmail).toHaveBeenCalledWith({
      to: "ada@example.org",
      template: "completion",
      props: {
        firstName: "Ada",
        certificateNumber: "KC-2026-000007",
        whatsappUrl: undefined,
      },
      profileId: ID,
      once: true,
      tags: { kind: "completion" },
    });
  });

  it("includes the WhatsApp link once it's set", async () => {
    prisma.siteSetting.findUnique.mockResolvedValue({
      value: {
        incidentFormUrl: "https://forms.example.org/x",
        whatsappUrl: "https://chat.whatsapp.com/abc",
      },
    });
    sendCompletionEmail(ID, "c1");
    await settle();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          whatsappUrl: "https://chat.whatsapp.com/abc",
        }),
      }),
    );
  });
});
