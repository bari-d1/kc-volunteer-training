import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (original) => ({
  ...(await original<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

const { Confetti } = await import("./confetti");

afterEach(() => {
  reduced.value = false;
});

describe("Confetti", () => {
  it("bursts as decoration only", () => {
    render(<Confetti />);
    const confetti = screen.getByTestId("confetti");
    expect(confetti).toHaveAttribute("aria-hidden", "true");
    expect(confetti.children.length).toBeGreaterThan(20);
  });

  it("is skipped with reduced motion", () => {
    reduced.value = true;
    render(<Confetti />);
    expect(screen.queryByTestId("confetti")).toBeNull();
  });
});
