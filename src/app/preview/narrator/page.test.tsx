import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

const { default: NarratorPreviewPage } = await import("./page");

afterEach(() => vi.unstubAllEnvs());

describe("/preview/narrator", () => {
  it("is a 404 in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => NarratorPreviewPage()).toThrow("NEXT_NOT_FOUND");
  });
});
