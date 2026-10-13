import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Motion reads prefers-reduced-motion once, so stub it before importing.
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: query.includes("prefers-reduced-motion"),
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
}));

const { FlipCardsBlock } = await import("./flip-cards-block");

describe("FlipCardsBlock with reduced motion", () => {
  it("crossfades in place instead of rotating", async () => {
    const { container } = render(
      <FlipCardsBlock
        blockId="b1"
        moduleId="m1"
        cards={[{ front: "Kingdom.", back: "First." }]}
      />,
    );
    expect(container.querySelector(".rotate-y-180, .transform-3d")).toBeNull();
    const faces = container.querySelectorAll(".transition-opacity");
    expect(faces).toHaveLength(2);
    expect(faces[1]).toHaveClass("opacity-0");

    await userEvent.click(screen.getByRole("button"));
    expect(faces[0]).toHaveClass("opacity-0");
    expect(faces[1]).not.toHaveClass("opacity-0");
  });
});
