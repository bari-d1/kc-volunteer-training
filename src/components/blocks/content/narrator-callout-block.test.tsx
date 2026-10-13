import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NarratorCalloutBlock } from "./narrator-callout-block";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("NarratorCalloutBlock", () => {
  it("shows the text in a speech bubble with the narrator state", () => {
    render(
      <NarratorCalloutBlock
        blockId="b1"
        moduleId="m1"
        state="celebrate"
        text="You did it!"
      />,
    );
    const callout = screen.getByRole("complementary", {
      name: "Your guide says",
    });
    expect(callout).toHaveAttribute("data-narrator-state", "celebrate");
    expect(callout).toHaveTextContent("You did it!");
    expect(callout.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("is dropped by the renderer when the volunteer hides the narrator", async () => {
    const { BlockRenderer } = await import("../block-renderer");
    const blocks = [
      {
        id: "n1",
        type: "NARRATOR_CALLOUT" as const,
        content: { state: "wave" as const, text: "Hi!" },
      },
      { id: "t1", type: "TEXT" as const, content: { markdown: "Lesson text" } },
    ];
    const { rerender } = render(
      <BlockRenderer blocks={blocks} moduleId="m1" />,
    );
    expect(screen.getByText("Hi!")).toBeInTheDocument();

    rerender(<BlockRenderer blocks={blocks} moduleId="m1" hideNarrator />);
    expect(screen.queryByText("Hi!")).toBeNull();
    expect(screen.getByText("Lesson text")).toBeInTheDocument();
  });
});
