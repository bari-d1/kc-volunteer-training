import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stand-in for the lazily loaded Rive component: records props, lets tests
// trigger load or failure.
const rive = vi.hoisted(() => ({
  props: null as null | Record<string, unknown>,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function MockRive(props: Record<string, unknown>) {
      rive.props = props;
      return <canvas data-testid="rive" />;
    },
}));

const { Narrator } = await import("./narrator");
const { NarratorFallback } = await import("./narrator-fallback");
const { isSlowConnection } = await import("./use-narrator-preferences");

function setMedia(reduced: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduced && q.includes("reduce"),
    addEventListener() {},
    removeEventListener() {},
  }));
}
function setConnection(c: object | undefined) {
  Object.defineProperty(navigator, "connection", {
    value: c,
    configurable: true,
  });
}

beforeEach(() => {
  rive.props = null;
  setMedia(false);
  setConnection({ effectiveType: "4g", saveData: false });
});
afterEach(() => vi.unstubAllGlobals());

const mode = () =>
  document
    .querySelector("[data-narrator-mode]")!
    .getAttribute("data-narrator-mode");

describe("Narrator", () => {
  it("loads Rive and swaps out the fallback once it's ready", () => {
    render(<Narrator state="wave" talking size={96} />);
    expect(screen.getByTestId("rive")).toBeInTheDocument();
    expect(rive.props).toMatchObject({
      state: "wave",
      talking: true,
      size: 96,
    });
    // Fallback stays visible until Rive reports it has loaded.
    expect(document.querySelector("[data-narrator-fallback]")).not.toBeNull();
    expect(mode()).toBe("fallback");

    act(() => (rive.props!.onLoad as () => void)());
    expect(document.querySelector("[data-narrator-fallback]")).toBeNull();
    expect(mode()).toBe("rive");
  });

  it("falls back when the .riv fails to load", () => {
    render(<Narrator state="think" />);
    act(() => (rive.props!.onError as () => void)());
    expect(screen.queryByTestId("rive")).toBeNull();
    expect(
      document.querySelector(
        '[data-narrator-fallback][data-narrator-state="think"]',
      ),
    ).not.toBeNull();
  });

  it("uses a static fallback when the visitor prefers reduced motion", () => {
    setMedia(true);
    render(<Narrator state="celebrate" />);
    expect(screen.queryByTestId("rive")).toBeNull();
    const svg = document.querySelector("[data-narrator-fallback]")!;
    expect(svg.getAttribute("class")).not.toMatch(/animate-/);
  });

  it.each([
    [{ saveData: true, effectiveType: "4g" }],
    [{ effectiveType: "2g" }],
    [{ effectiveType: "slow-2g" }],
  ])(
    "uses the fallback on a slow connection or data saver (%o)",
    (connection) => {
      setConnection(connection);
      render(<Narrator />);
      expect(screen.queryByTestId("rive")).toBeNull();
      expect(document.querySelector("[data-narrator-fallback]")).not.toBeNull();
    },
  );

  it("honours forceFallback and the reducedMotion override", () => {
    const { rerender } = render(<Narrator forceFallback />);
    expect(screen.queryByTestId("rive")).toBeNull();
    rerender(<Narrator reducedMotion />);
    expect(screen.queryByTestId("rive")).toBeNull();
  });
});

describe("isSlowConnection", () => {
  it.each([
    [{ effectiveType: "4g" }, false],
    [{ effectiveType: "3g" }, false],
    [{ effectiveType: "2g" }, true],
    [{ saveData: true }, true],
    [undefined, false],
  ])("%o → %s", (c, expected) => {
    expect(isSlowConnection(c)).toBe(expected);
  });
});

describe("NarratorFallback", () => {
  it.each([
    ["wave", "animate-narrator-wave"],
    ["celebrate", "animate-narrator-bounce"],
    ["think", "animate-narrator-think"],
    ["encourage", "animate-narrator-nod"],
  ] as const)("animates %s with %s", (state, animation) => {
    const { container } = render(
      <NarratorFallback
        state={state}
        talking={false}
        size={80}
        reducedMotion={false}
      />,
    );
    expect(container.querySelector("svg")!.getAttribute("class")).toContain(
      animation,
    );
  });

  it("holds still with reduced motion, even while talking", () => {
    const { container } = render(
      <NarratorFallback state="wave" talking size={80} reducedMotion />,
    );
    expect(container.innerHTML).not.toMatch(/animate-/);
  });

  it("stays under 3 KB", () => {
    const markup = renderToStaticMarkup(
      <NarratorFallback
        state="celebrate"
        talking
        size={160}
        reducedMotion={false}
      />,
    );
    expect(new TextEncoder().encode(markup).length).toBeLessThan(3 * 1024);
  });
});
