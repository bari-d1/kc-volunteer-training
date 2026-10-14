import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Environment ────────────────────────────────────────────────────────────
const nav = vi.hoisted(() => ({ pathname: "/course/kc/welcome" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

type Entry = { isIntersecting: boolean; target: Element };
const observers: Array<{ cb: (e: Entry[]) => void; els: Element[] }> = [];
class FakeIO {
  o: { cb: (e: Entry[]) => void; els: Element[] };
  constructor(cb: (e: Entry[]) => void) {
    this.o = { cb, els: [] };
    observers.push(this.o);
  }
  observe(el: Element) {
    this.o.els.push(el);
  }
  unobserve(el: Element) {
    this.o.els = this.o.els.filter((e) => e !== el);
  }
  disconnect() {
    this.o.els = [];
  }
}

/** The element a narrator trigger inside `block` observes (not Reveal's own). */
function triggerIn(block: Element) {
  for (const o of observers)
    for (const el of o.els) if (el !== block && block.contains(el)) return el;
  return null;
}
/** Scrolls an element into view. */
function view(el: Element) {
  act(() => {
    for (const o of [...observers])
      if (o.els.includes(el)) o.cb([{ isIntersecting: true, target: el }]);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  observers.length = 0;
  nav.pathname = "/course/kc/welcome";
  sessionStorage.clear();
  vi.stubGlobal("IntersectionObserver", FakeIO);
  // Reduced motion: bubbles show instantly and the mascot is the static fallback.
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("reduce"),
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const { NarratorProvider, NarratorConfig, useNarrator, readableDuration } =
  await import("./narrator-context");
const { NarratorWelcome } = await import("./narrator-welcome");

type Api = ReturnType<typeof useNarrator>;
let api!: Api;
function Grab() {
  const narrator = useNarrator();
  useEffect(() => {
    api = narrator;
  });
  return null;
}

function renderNarrated(ui: React.ReactNode = null, enabled = true) {
  return render(
    <NarratorProvider>
      <NarratorConfig enabled={enabled} />
      <Grab />
      {ui}
    </NarratorProvider>,
  );
}
const dock = () => screen.queryByRole("complementary", { name: "Your guide" });
const bubbleText = () =>
  dock()?.querySelector('[aria-live="polite"]')?.textContent ?? null;
const pose = () =>
  dock()!
    .querySelector("[data-narrator-state]")!
    .getAttribute("data-narrator-state");

// ── Provider rules ─────────────────────────────────────────────────────────
describe("NarratorProvider", () => {
  it("shows one message at a time; the newest replaces the current", () => {
    renderNarrated();
    act(() => api.say("First message", "wave"));
    expect(bubbleText()).toBe("First message");
    expect(pose()).toBe("wave");

    act(() => api.say("Second message", "point"));
    expect(bubbleText()).toBe("Second message");
    expect(dock()!.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
    expect(pose()).toBe("point");
  });

  it("auto-hides after a readable delay, then returns to idle", () => {
    renderNarrated();
    act(() => api.say("Hello there, volunteer!", "wave"));
    act(() =>
      vi.advanceTimersByTime(readableDuration("Hello there, volunteer!") - 10),
    );
    expect(bubbleText()).toBe("Hello there, volunteer!");
    act(() => vi.advanceTimersByTime(20));
    expect(bubbleText()).toBeNull();
    expect(pose()).toBe("idle");
  });

  it("doesn't restart for the same message (e.g. a re-render)", () => {
    renderNarrated();
    act(() => api.say("Same text", "think"));
    act(() => vi.advanceTimersByTime(3000));
    act(() => api.say("Same text", "think"));
    act(() =>
      vi.advanceTimersByTime(readableDuration("Same text") - 3000 + 10),
    );
    expect(bubbleText()).toBeNull();
  });

  it("pauses auto-hide while the dock is hovered", () => {
    renderNarrated();
    act(() => api.say("Hold on", "idle"));
    fireEvent.mouseEnter(dock()!);
    act(() => vi.advanceTimersByTime(60_000));
    expect(bubbleText()).toBe("Hold on");
    fireEvent.mouseLeave(dock()!);
    act(() => vi.advanceTimersByTime(readableDuration("Hold on") + 10));
    expect(bubbleText()).toBeNull();
  });

  it("says once-per-visit keys again only after navigating", () => {
    const { rerender } = renderNarrated();
    act(() => api.say("Callout", "wave", { key: "c1", once: "visit" }));
    act(() => api.dismiss());
    act(() => api.say("Callout", "wave", { key: "c1", once: "visit" }));
    expect(bubbleText()).toBeNull();

    nav.pathname = "/course/kc/about-kc";
    rerender(
      <NarratorProvider>
        <NarratorConfig enabled />
        <Grab />
      </NarratorProvider>,
    );
    act(() => api.say("Callout", "wave", { key: "c1", once: "visit" }));
    expect(bubbleText()).toBe("Callout");
  });

  it("keeps once-per-session keys across remounts", () => {
    const first = renderNarrated();
    act(() => api.say("Hi", "wave", { key: "w", once: "session" }));
    first.unmount();
    renderNarrated();
    act(() => api.say("Hi", "wave", { key: "w", once: "session" }));
    expect(bubbleText()).toBeNull();
  });

  it("closes on dismiss and does nothing when switched off", () => {
    const { unmount } = renderNarrated();
    act(() => api.say("Bye", "wave"));
    fireEvent.click(screen.getByRole("button", { name: "Close message" }));
    expect(bubbleText()).toBeNull();
    unmount();

    renderNarrated(null, false);
    act(() => api.say("Hidden", "wave"));
    expect(dock()).toBeNull();
    expect(api.available).toBe(false);
    expect(api.present).toBe(true);
  });

  it("changes pose without a message", () => {
    renderNarrated();
    act(() => api.setState("think"));
    expect(pose()).toBe("think");
    expect(bubbleText()).toBeNull();
  });
});

describe("readableDuration", () => {
  it("grows with length within 4–20 seconds", () => {
    expect(readableDuration("Hi")).toBe(4000);
    expect(readableDuration("word ".repeat(30))).toBeGreaterThan(
      readableDuration("word ".repeat(10)),
    );
    expect(readableDuration("word ".repeat(500))).toBe(20000);
  });
});

// ── Triggers ───────────────────────────────────────────────────────────────
const { BlockRenderer } = await import("@/components/blocks/block-renderer");

describe("course triggers", () => {
  it("says a narrator callout when it scrolls into view, once per visit, with no inline card", () => {
    const { container } = renderNarrated(
      <BlockRenderer
        moduleId="m1"
        blocks={[
          {
            id: "c1",
            type: "NARRATOR_CALLOUT",
            content: { state: "wave", text: "Let's begin!" },
          },
        ]}
      />,
    );
    expect(
      screen.queryByRole("complementary", { name: "Your guide says" }),
    ).toBeNull();
    const trigger = container.querySelector("[data-narrator-trigger]")!;
    view(trigger);
    expect(bubbleText()).toBe("Let's begin!");
    expect(pose()).toBe("wave");
  });

  it("points at interactive blocks with a hint, unless a callout introduces them", () => {
    const { container } = renderNarrated(
      <BlockRenderer
        moduleId="m1"
        blocks={[
          {
            id: "f1",
            type: "FLIP_CARDS",
            content: { cards: [{ front: "Kingdom.", back: "First." }] },
          },
          {
            id: "c1",
            type: "NARRATOR_CALLOUT",
            content: { state: "think", text: "Pick a year." },
          },
          {
            id: "t1",
            type: "TIMELINE",
            content: { events: [{ year: "2015", title: "Start" }] },
          },
        ]}
      />,
    );
    view(triggerIn(container.querySelector('[data-block-id="f1"]')!)!);
    expect(bubbleText()).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(bubbleText()).toBe("Tap a card to flip it.");
    expect(pose()).toBe("point");

    // The timeline follows a callout, so it gets no extra hint wrapper.
    expect(
      triggerIn(container.querySelector('[data-block-id="t1"]')!),
    ).toBeNull();
  });

  it("lets a hint give way to a callout, then speak once the narrator is quiet", () => {
    const { container } = renderNarrated(
      <BlockRenderer
        moduleId="m1"
        blocks={[
          {
            id: "c1",
            type: "NARRATOR_CALLOUT",
            content: { state: "wave", text: "Welcome!" },
          },
          { id: "x1", type: "TEXT", content: { markdown: "Intro" } },
          {
            id: "f1",
            type: "FLIP_CARDS",
            content: { cards: [{ front: "Kingdom.", back: "First." }] },
          },
        ]}
      />,
    );
    const hintTarget = triggerIn(
      container.querySelector('[data-block-id="f1"]')!,
    )!;
    // Both visible on load: the callout wins and the hint stays armed.
    view(container.querySelector("[data-narrator-trigger]")!);
    view(hintTarget);
    act(() => vi.advanceTimersByTime(1000));
    expect(bubbleText()).toBe("Welcome!");

    // Once the welcome hides, the waiting hint speaks without re-scrolling.
    act(() => vi.advanceTimersByTime(readableDuration("Welcome!") + 10));
    act(() => vi.advanceTimersByTime(1000));
    expect(bubbleText()).toBe("Tap a card to flip it.");
  });

  it("thinks while the reflection box is focused", () => {
    renderNarrated(
      <BlockRenderer
        moduleId="m1"
        blocks={[
          {
            id: "c0",
            type: "NARRATOR_CALLOUT",
            content: { state: "wave", text: "Reflect." },
          },
          {
            id: "r1",
            type: "REFLECTION",
            content: {
              prompt: "Why serve?",
              revealTitle: "A",
              revealBody: "B",
            },
          },
        ]}
      />,
    );
    const box = screen.getByRole("textbox", { name: "Why serve?" });
    fireEvent.focus(box);
    expect(pose()).toBe("think");
    fireEvent.blur(box);
    expect(pose()).toBe("idle");
  });

  it("welcomes the volunteer on the dashboard once per session", () => {
    const first = renderNarrated(<NarratorWelcome firstName="Ada" />);
    expect(bubbleText()).toBe("Welcome back, Ada!");
    expect(pose()).toBe("wave");
    first.unmount();
    renderNarrated(<NarratorWelcome firstName="Ada" />);
    expect(bubbleText()).toBeNull();
  });
});
