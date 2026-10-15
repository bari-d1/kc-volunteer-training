import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getPublicCertificate = vi.fn();
vi.mock("@/server/certificates", () => ({
  getPublicCertificate: (n: string) => getPublicCertificate(n),
  formatCertificateDate: () => "15 October 2026",
}));

const { default: Page } = await import("./page");

async function renderPage(certificateNumber: string) {
  const page = Page({
    params: Promise.resolve({ certificateNumber }),
  } as never);
  // The verification sits inside Suspense: render it directly.
  const suspense = (page.props as { children: React.ReactElement[] })
    .children[1] as React.ReactElement<{ children: React.ReactElement }>;
  const inner = suspense.props.children as React.ReactElement<object> & {
    type: (p: object) => Promise<React.ReactNode>;
  };
  return render(await inner.type(inner.props));
}

describe("certificate verification page", () => {
  it("shows the first name, last initial, course and date", async () => {
    getPublicCertificate.mockResolvedValue({
      certificateNumber: "KC-2026-000123",
      name: "Ada L.",
      courseTitle: "Volunteers' Onboarding",
      issuedAt: new Date("2026-10-15T09:30:00Z"),
    });
    await renderPage("kc-2026-000123");
    expect(getPublicCertificate).toHaveBeenCalledWith("KC-2026-000123");
    expect(screen.getByRole("heading", { name: "Ada L." })).toBeVisible();
    expect(screen.getByText("Volunteers' Onboarding")).toBeVisible();
    expect(screen.getByText("15 October 2026")).toBeVisible();
    expect(screen.getByText("KC-2026-000123")).toBeVisible();
  });

  it("says when a certificate doesn't exist", async () => {
    getPublicCertificate.mockResolvedValue(null);
    await renderPage("KC-2026-999999");
    expect(
      screen.getByRole("heading", { name: "Certificate not found" }),
    ).toBeVisible();
  });
});
