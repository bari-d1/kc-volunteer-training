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
});
