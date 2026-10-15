// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NUMBER = "KC-2026-000123";

const row = {
  certificateNumber: NUMBER,
  profileId: OWNER,
  issuedAt: new Date("2026-10-15T09:30:00Z"),
  profile: { firstName: "Ada", lastName: "lovelace" },
  course: { title: "Volunteers' Onboarding" },
};
const findUnique = vi.fn(
  async ({ where }: { where: { certificateNumber: string } }) =>
    where.certificateNumber === NUMBER ? row : null,
);
vi.mock("@/lib/prisma", () => ({
  prisma: { certificate: { findUnique: (a: never) => findUnique(a) } },
}));

let user: { id: string; email: string } | null = null;
let admin = false;
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => user }));
vi.mock("@/lib/admin-auth", () => ({ isAdmin: async () => admin }));

const {
  formatCertificateDate,
  getCertificateForDownload,
  getPublicCertificate,
} = await import("./certificates");
const { nextCertificateNumber, isCertificateNumber } =
  await import("./certificate-number");
const pdfRoute =
  await import("@/app/api/certificates/[certificateNumber]/pdf/route");
const badgeRoute =
  await import("@/app/api/certificates/[certificateNumber]/badge/route");

beforeEach(() => {
  user = null;
  admin = false;
  findUnique.mockClear();
});

type Route = {
  GET: (request: Request, ctx: never) => Promise<Response>;
};
const get = (route: Route, certificateNumber: string) =>
  route.GET(new Request("http://localhost/x"), {
    params: Promise.resolve({ certificateNumber }),
  } as never);

describe("certificate numbers", () => {
  it("formats the counter as KC-<year>-<6 digits>", async () => {
    const tx = { $queryRaw: vi.fn(async () => [{ last: 123 }]) };
    expect(
      await nextCertificateNumber(
        tx as never,
        new Date("2026-03-01T00:00:00Z"),
      ),
    ).toBe("KC-2026-000123");
    // One counter row per year.
    const [, key] = tx.$queryRaw.mock.calls[0] as unknown as [unknown, string];
    expect(key).toBe("certificate-counter:2026");
  });

  it("recognises valid numbers only", () => {
    expect(isCertificateNumber("KC-2026-000123")).toBe(true);
    expect(isCertificateNumber("KC-2026-123")).toBe(false);
    expect(isCertificateNumber("kc-2026-000123")).toBe(false);
  });

  it("formats the completion date in words", () => {
    expect(formatCertificateDate(new Date("2026-10-15T09:30:00Z"))).toBe(
      "15 October 2026",
    );
    // 23:30 UTC on 14 October is already the 15th in British Summer Time.
    expect(formatCertificateDate(new Date("2026-10-14T23:30:00Z"))).toBe(
      "15 October 2026",
    );
  });
});

describe("getCertificateForDownload", () => {
  it("gives the owner their certificate", async () => {
    user = { id: OWNER, email: "ada@example.org" };
    expect(await getCertificateForDownload(NUMBER)).toEqual({
      status: "ok",
      certificate: {
        certificateNumber: NUMBER,
        firstName: "Ada",
        lastName: "lovelace",
        courseTitle: "Volunteers' Onboarding",
        issuedAt: row.issuedAt,
      },
    });
  });

  it("refuses another volunteer", async () => {
    user = { id: OTHER, email: "bob@example.org" };
    expect(await getCertificateForDownload(NUMBER)).toEqual({
      status: "forbidden",
    });
  });

  it("lets an admin download any certificate", async () => {
    admin = true;
    expect((await getCertificateForDownload(NUMBER)).status).toBe("ok");
  });

  it("asks a signed-out visitor to sign in, without looking anything up", async () => {
    expect(await getCertificateForDownload(NUMBER)).toEqual({
      status: "unauthorised",
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("doesn't query for malformed numbers", async () => {
    user = { id: OWNER, email: "ada@example.org" };
    expect(await getCertificateForDownload("../../etc")).toEqual({
      status: "not-found",
    });
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("getPublicCertificate", () => {
  it("shows only the first name, last initial, course and date", async () => {
    const certificate = await getPublicCertificate(NUMBER);
    expect(certificate).toEqual({
      certificateNumber: NUMBER,
      name: "Ada L.",
      courseTitle: "Volunteers' Onboarding",
      issuedAt: row.issuedAt,
    });
    expect(JSON.stringify(certificate)).not.toContain("lovelace");
    expect(JSON.stringify(certificate)).not.toContain(OWNER);
  });

  it("returns null for an unknown number", async () => {
    expect(await getPublicCertificate("KC-2026-999999")).toBeNull();
  });
});

describe("certificate routes", () => {
  it("returns 403 to another volunteer for the PDF and badge", async () => {
    user = { id: OTHER, email: "bob@example.org" };
    for (const route of [pdfRoute, badgeRoute]) {
      const response = await get(route, NUMBER);
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  });

  it("returns 401 when signed out and 404 for an unknown number", async () => {
    expect((await get(pdfRoute, NUMBER)).status).toBe(401);
    user = { id: OWNER, email: "ada@example.org" };
    expect((await get(pdfRoute, "KC-2026-999999")).status).toBe(404);
  });

  it("renders the owner's PDF", { timeout: 30_000 }, async () => {
    user = { id: OWNER, email: "ada@example.org" };
    const response = await get(pdfRoute, NUMBER);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain(
      `${NUMBER}.pdf`,
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    // Inter is embedded, not substituted.
    expect(bytes.toString("latin1")).toMatch(/FontName\s*\/[A-Z]{6}\+Inter/);
  });

  it("renders the owner's square badge", { timeout: 30_000 }, async () => {
    user = { id: OWNER, email: "ada@example.org" };
    const response = await get(badgeRoute, NUMBER);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.readUInt32BE(16)).toBe(1080);
    expect(bytes.readUInt32BE(20)).toBe(1080);
  });
});
