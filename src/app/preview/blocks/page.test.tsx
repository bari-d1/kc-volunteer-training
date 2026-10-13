import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const { default: BlocksPreviewPage } = await import("./page");

describe("/preview/blocks", () => {
  it("is a 404 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => BlocksPreviewPage()).toThrow("NEXT_NOT_FOUND");
  });

  it("shows every block type in development", () => {
    const { container } = render(<BlocksPreviewPage />);
    expect(
      screen.getByRole("heading", { name: "Block preview" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("[data-block-type]")).toHaveLength(16);
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
});
