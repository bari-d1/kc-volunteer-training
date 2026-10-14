import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpeechBubble } from "./speech-bubble";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const typed = (container: HTMLElement) =>
  container.querySelector('p[aria-hidden="true"] span.absolute')!.textContent;
const live = (container: HTMLElement) =>
  container.querySelector('[aria-live="polite"]')!;

describe("SpeechBubble", () => {
  it("types the text out while talking, but gives screen readers the full text once", () => {
    const onTalkingChange = vi.fn();
    const { container } = render(
      <SpeechBubble
        text="Hi there!"
        speed={10}
        onTalkingChange={onTalkingChange}
      />,
    );
    expect(live(container)).toHaveTextContent("Hi there!");
    expect(onTalkingChange).toHaveBeenLastCalledWith(true);
    expect(typed(container)).toBe("");

    act(() => vi.advanceTimersByTime(30));
    expect(typed(container)).toBe("Hi ");
    expect(live(container)).toHaveTextContent("Hi there!");

    act(() => vi.advanceTimersByTime(100));
    expect(typed(container)).toBe("Hi there!");
    expect(onTalkingChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps the typed text out of the accessibility tree", () => {
    const { container } = render(<SpeechBubble text="Hello" />);
    expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(typed(container)).not.toBeNull();
    expect(container.querySelector('p[aria-hidden="true"]')).not.toBeNull();
  });

  it("shows everything instantly with reduced motion", () => {
    const onTalkingChange = vi.fn();
    const { container } = render(
      <SpeechBubble
        text="No typing."
        reducedMotion
        onTalkingChange={onTalkingChange}
      />,
    );
    expect(typed(container)).toBe("No typing.");
    expect(onTalkingChange).not.toHaveBeenCalledWith(true);
  });

  it("restarts typing when the text changes", () => {
    const { container, rerender } = render(
      <SpeechBubble text="One" speed={10} />,
    );
    act(() => vi.advanceTimersByTime(100));
    rerender(<SpeechBubble text="Two words" speed={10} />);
    expect(typed(container)).toBe("");
    expect(live(container)).toHaveTextContent("Two words");
  });
});
