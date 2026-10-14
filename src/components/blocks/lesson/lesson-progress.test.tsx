import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const saveProgressAction = vi.fn<
  (input: {
    moduleId: string;
    lastBlockOrder: number;
  }) => Promise<{ ok: boolean }>
>(async () => ({ ok: true }));
const completeModuleAction = vi.fn<
  (input: {
    moduleId: string;
  }) => Promise<{ ok: boolean; error?: string; newlyCompleted?: boolean }>
>(async () => ({ ok: true, newlyCompleted: true }));
vi.mock("@/app/actions/progress", () => ({
  saveProgressAction: (i: { moduleId: string; lastBlockOrder: number }) =>
    saveProgressAction(i),
  completeModuleAction: (i: { moduleId: string }) => completeModuleAction(i),
}));
vi.mock("@/app/actions/knowledge-check", () => ({}));
const narrator = vi.hoisted(() => ({
  available: false,
  present: true,
  say: vi.fn(),
  setState: vi.fn(),
  dismiss: vi.fn(),
}));
vi.mock("@/components/narrator/narrator-context", () => ({
  useNarrator: () => narrator,
}));
const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));

// Controllable IntersectionObserver.
type Callback = (
  entries: Array<{ isIntersecting: boolean; target: Element }>,
) => void;
const observers: Array<{ callback: Callback; targets: Element[] }> = [];
class FakeObserver {
  entry: { callback: Callback; targets: Element[] };
  constructor(callback: Callback) {
    this.entry = { callback, targets: [] };
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.targets.push(el);
  }
  unobserve() {}
  disconnect() {}
}
function show(selector: string) {
  const el = document.querySelector(selector)!;
  act(() => {
    for (const o of observers)
      if (o.targets.includes(el))
        o.callback([{ isIntersecting: true, target: el }]);
  });
}
const showEnd = () => {
  act(() => {
    // The end sentinel is the only target of its own observer.
    const endObserver = observers.find(
      (o) =>
        o.targets.length === 1 &&
        !(o.targets[0] as HTMLElement).dataset.blockOrder,
    )!;
    endObserver.callback([
      { isIntersecting: true, target: endObserver.targets[0] },
    ]);
  });
};

const { LessonProgress, SAVE_INTERVAL_MS } = await import("./lesson-progress");
const { KNOWLEDGE_CHECK_PASSED_EVENT } =
  await import("@/components/blocks/content/knowledge-check-block");

const MODULE_ID = "11111111-1111-4111-8111-111111111111";
const blocks = (
  <>
    {[0, 1, 2, 3].map((order) => (
      <div key={order} data-block-order={order}>
        Block {order}
      </div>
    ))}
  </>
);
function renderLesson(
  props: Partial<Parameters<typeof LessonProgress>[0]> = {},
) {
  return render(
    <LessonProgress
      moduleId={MODULE_ID}
      requiresCheck={false}
      initial={{ lastBlockOrder: 0, checkPassed: false, completed: false }}
      firstBlockOrder={0}
      continueHref="/course/kc/next"
      nextTitle="About KC"
      previous={null}
      nextUnlocked={null}
      {...props}
    >
      {blocks}
    </LessonProgress>,
  );
}

beforeEach(() => {
  observers.length = 0;
  vi.clearAllMocks();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("progress saving", () => {
  it("saves the furthest block at most once per interval", async () => {
    vi.useFakeTimers();
    renderLesson();
    show('[data-block-order="1"]');
    show('[data-block-order="2"]');
    expect(saveProgressAction).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(SAVE_INTERVAL_MS));
    expect(saveProgressAction).toHaveBeenCalledTimes(1);
    expect(saveProgressAction).toHaveBeenCalledWith({
      moduleId: MODULE_ID,
      lastBlockOrder: 2,
    });

    // Scrolling back up doesn't save again.
    show('[data-block-order="1"]');
    await act(() => vi.advanceTimersByTimeAsync(SAVE_INTERVAL_MS));
    expect(saveProgressAction).toHaveBeenCalledTimes(1);
  });

  it("saves straight away when the tab is hidden", () => {
    renderLesson();
    show('[data-block-order="3"]');
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(saveProgressAction).toHaveBeenCalledWith({
      moduleId: MODULE_ID,
      lastBlockOrder: 3,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });
});

describe("resume", () => {
  it("offers to pick up where they left off and scrolls there", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderLesson({
      initial: { lastBlockOrder: 2, checkPassed: false, completed: false },
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Pick up where you left off" }),
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toHaveTextContent("Block 2");
    expect(screen.getByText("Block 2")).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "Pick up where you left off" }),
    ).toBeNull();
  });

  it("doesn't offer to resume at the start or after completing", () => {
    const { unmount } = renderLesson();
    expect(screen.queryByRole("button", { name: /Pick up/ })).toBeNull();
    unmount();
    renderLesson({
      initial: { lastBlockOrder: 3, checkPassed: false, completed: true },
    });
    expect(screen.queryByRole("button", { name: /Pick up/ })).toBeNull();
  });
});

describe("Continue", () => {
  it("enables once the end of the page is reached, then completes and moves on", async () => {
    renderLesson();
    const button = screen.getByRole("button", { name: "Continue: About KC" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Reach the end of the module to continue",
    );

    showEnd();
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(completeModuleAction).toHaveBeenCalledWith({ moduleId: MODULE_ID });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/course/kc/next"));
  });

  it("waits for this module's knowledge check when one is required", async () => {
    renderLesson({ requiresCheck: true });
    showEnd();
    const button = screen.getByRole("button", { name: "Continue: About KC" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(
      "Complete the check above to continue",
    );

    // Another module's check doesn't count.
    act(() => {
      window.dispatchEvent(
        new CustomEvent(KNOWLEDGE_CHECK_PASSED_EVENT, {
          detail: { blockId: "b", moduleId: "other", modulePassed: true },
        }),
      );
    });
    expect(button).toBeDisabled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(KNOWLEDGE_CHECK_PASSED_EVENT, {
          detail: { blockId: "b", moduleId: MODULE_ID, modulePassed: true },
        }),
      );
    });
    expect(button).toBeEnabled();
  });

  it("goes back to the dashboard from the last module", () => {
    renderLesson({ nextTitle: null, continueHref: "/course/kc" });
    expect(
      screen.getByRole("button", { name: "Finish and return to dashboard" }),
    ).toBeInTheDocument();
  });

  it("is enabled straight away for a completed module", () => {
    renderLesson({
      requiresCheck: true,
      initial: { lastBlockOrder: 3, checkPassed: true, completed: true },
    });
    expect(
      screen.getByRole("button", { name: "Continue: About KC" }),
    ).toBeEnabled();
  });

  it("explains if the server still wants the check", async () => {
    completeModuleAction.mockResolvedValueOnce({
      ok: false,
      error: "check-required",
    });
    renderLesson({
      initial: { lastBlockOrder: 0, checkPassed: true, completed: false },
      requiresCheck: true,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Continue: About KC" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Complete the check above to continue",
    );
    expect(push).not.toHaveBeenCalled();
  });
});

describe("completion and navigation", () => {
  it("shows Module complete! the first time only", async () => {
    renderLesson({
      initial: { lastBlockOrder: 3, checkPassed: false, completed: true },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Continue: About KC" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith({
      variant: "success",
      title: "Module complete!",
    });

    toast.mockClear();
    completeModuleAction.mockResolvedValueOnce({
      ok: true,
      newlyCompleted: false,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Continue: About KC" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledTimes(2));
    expect(toast).not.toHaveBeenCalled();
  });

  it("links to the previous module and to an unlocked next module", () => {
    renderLesson({
      previous: { href: "/course/kc/welcome", title: "Welcome" },
      nextUnlocked: { href: "/course/kc/values", title: "Our Values" },
    });
    const nav = screen.getByRole("navigation", { name: "Module navigation" });
    expect(
      within(nav).getByRole("link", { name: /Previous.*Welcome/ }),
    ).toHaveAttribute("href", "/course/kc/welcome");
    expect(
      within(nav).getByRole("link", { name: /Next.*Our Values/ }),
    ).toHaveAttribute("href", "/course/kc/values");
  });

  it("has no Next link when the next module is locked", () => {
    renderLesson({
      previous: { href: "/course/kc/welcome", title: "Welcome" },
    });
    const nav = screen.getByRole("navigation", { name: "Module navigation" });
    expect(within(nav).getAllByRole("link")).toHaveLength(1);
    expect(within(nav).queryByRole("link", { name: /Next/ })).toBeNull();
  });

  it("has the narrator celebrate instead of a toast when it's on", async () => {
    narrator.available = true;
    renderLesson({
      initial: { lastBlockOrder: 3, checkPassed: false, completed: true },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Continue: About KC" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(narrator.say).toHaveBeenCalledWith(
      "Module complete! On to the next one.",
      "celebrate",
    );
    expect(toast).not.toHaveBeenCalled();
    narrator.available = false;
  });
});
