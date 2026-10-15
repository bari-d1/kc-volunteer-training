import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({ default: () => () => null }));

type Cb = (
  entries: Array<{ isIntersecting: boolean; target: Element }>,
) => void;
let observe: Cb = () => {};
const targets: Element[] = [];
beforeEach(() => {
  targets.length = 0;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: Cb) {
        observe = cb;
      }
      observe(el: Element) {
        targets.push(el);
      }
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
});

const { NarratorDock } = await import("./narrator-dock");

describe("NarratorDock", () => {
  it("collapses to just the mascot and back", async () => {
    render(<NarratorDock text="Hi! I'm your guide." />);
    const toggle = screen.getByRole("button", {
      name: "Hide your guide's message",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("complementary", { name: "Your guide" }),
    ).toHaveTextContent("Hi! I'm your guide.");

    await userEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "Ask your guide" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Hi! I'm your guide.")).toBeNull();
  });

  it("tucks away while the Continue footer is on screen", () => {
    render(
      <>
        <footer data-narrator-avoid="">Continue</footer>
        <NarratorDock text="Hello" />
      </>,
    );
    expect(targets).toHaveLength(1);
    act(() => observe([{ isIntersecting: true, target: targets[0] }]));
    expect(
      screen.getByRole("button", { name: "Ask your guide" }),
    ).toBeInTheDocument();
    act(() => observe([{ isIntersecting: false, target: targets[0] }]));
    expect(
      screen.getByRole("button", { name: "Hide your guide's message" }),
    ).toBeInTheDocument();
  });

  it("asks for a message when the mascot is tapped with none showing", async () => {
    const onSummon = vi.fn();
    render(<NarratorDock onSummon={onSummon} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Ask your guide" }),
    );
    expect(onSummon).toHaveBeenCalledTimes(1);
  });

  it("shows a message the volunteer asked for, even over Continue", () => {
    const { rerender } = render(
      <>
        <footer data-narrator-avoid="">Continue</footer>
        <NarratorDock text="Hello" />
      </>,
    );
    act(() => observe([{ isIntersecting: true, target: targets[0] }]));
    expect(screen.queryByText("Hello")).toBeNull();
    rerender(
      <>
        <footer data-narrator-avoid="">Continue</footer>
        <NarratorDock text="Hello" summoned />
      </>,
    );
    expect(
      screen.getByRole("complementary", { name: "Your guide" }),
    ).toHaveTextContent("Hello");
  });

  it("reserves space at the end of the page", () => {
    const { container } = render(<NarratorDock text="Hello" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveClass("h-28");
  });
});
