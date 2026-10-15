import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const verifyUnsubscribeToken = vi.fn();
vi.mock("@/lib/unsubscribe-token", () => ({
  verifyUnsubscribeToken: (t: string) => verifyUnsubscribeToken(t),
}));
vi.mock("./actions", () => ({ confirmUnsubscribe: vi.fn() }));

const { default: Page } = await import("./page");

/** Renders the page's Suspense content for the given query string. */
async function renderPage(params: Record<string, string>) {
  const page = Page({ searchParams: Promise.resolve(params) } as never);
  const suspense = (page.props as { children: React.ReactElement[] })
    .children[1] as React.ReactElement<{
    children: Promise<React.ReactElement>;
  }>;
  const inner = (await suspense.props
    .children) as React.ReactElement<object> & {
    type: (p: object) => Promise<React.ReactNode>;
  };
  return render(await inner.type(inner.props));
}

describe("unsubscribe page", () => {
  it("asks to confirm with one button for a valid link", async () => {
    verifyUnsubscribeToken.mockResolvedValueOnce("profile-1");
    await renderPage({ token: "good" });
    expect(
      screen.getByRole("heading", { name: "Stop reminder emails?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unsubscribe" })).toBeVisible();
    expect(document.querySelector('input[name="token"]')).toHaveValue("good");
  });

  it("explains a broken link", async () => {
    verifyUnsubscribeToken.mockResolvedValueOnce(null);
    await renderPage({ token: "bad" });
    expect(
      screen.getByRole("heading", { name: "That link didn't work" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("confirms once done", async () => {
    await renderPage({ done: "1" });
    expect(
      screen.getByRole("heading", { name: "You're unsubscribed" }),
    ).toBeInTheDocument();
  });
});
