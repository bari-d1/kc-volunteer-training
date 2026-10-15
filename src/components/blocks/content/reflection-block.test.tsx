import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveReflectionAction = vi.hoisted(() =>
  vi.fn<
    (input: { blockId: string; answer: string }) => Promise<{
      ok: boolean;
      error?: string;
    }>
  >(async () => ({ ok: true })),
);
vi.mock("@/app/actions/reflections", () => ({
  saveReflectionAction: (input: { blockId: string; answer: string }) =>
    saveReflectionAction(input),
}));

const { ReflectionBlock, REFLECTION_SAVE_DELAY_MS } =
  await import("./reflection-block");
const { ReflectionAnswersProvider } = await import("./reflection-answers");

const BLOCK = "11111111-1111-4111-8111-111111111111";
const props = {
  blockId: BLOCK,
  moduleId: "m",
  prompt: "What do you think is required to serve?",
  revealTitle: "What isn't required",
  revealBody: "- Perfection\n- Experience",
};

function renderInLesson(answers: Record<string, string> = {}) {
  return render(
    <ReflectionAnswersProvider answers={answers}>
      <ReflectionBlock {...props} />
    </ReflectionAnswersProvider>,
  );
}
const box = () => screen.getByRole("textbox", { name: props.prompt });
const type = (text: string) =>
  fireEvent.change(box(), { target: { value: text } });

beforeEach(() => {
  vi.useFakeTimers();
  saveReflectionAction.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("saving reflection answers", () => {
  it("shows the volunteer's saved answer when they come back", () => {
    renderInLesson({ [BLOCK]: "A willing heart" });
    expect(box()).toHaveValue("A willing heart");
    expect(box()).toHaveAccessibleDescription(
      "Your answer is saved to your training record as you type.",
    );
  });

  it("saves a moment after typing stops, then says so", async () => {
    renderInLesson();
    type("Being on time");
    type("Being on time and humble");
    expect(saveReflectionAction).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(REFLECTION_SAVE_DELAY_MS));
    expect(saveReflectionAction).toHaveBeenCalledTimes(1);
    expect(saveReflectionAction).toHaveBeenCalledWith({
      blockId: BLOCK,
      answer: "Being on time and humble",
    });
    expect(box()).toHaveAccessibleDescription("Saved to your training record.");
  });

  it("saves straight away on leaving the box, and not again if unchanged", async () => {
    renderInLesson({ [BLOCK]: "Old answer" });
    fireEvent.blur(box());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saveReflectionAction).not.toHaveBeenCalled();

    type("New answer");
    fireEvent.blur(box());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saveReflectionAction).toHaveBeenCalledTimes(1);
    // The pending typing save was replaced by the blur save.
    await act(() => vi.advanceTimersByTimeAsync(REFLECTION_SAVE_DELAY_MS));
    expect(saveReflectionAction).toHaveBeenCalledTimes(1);
  });

  it("saves before revealing KC's answer, shown as a list", async () => {
    renderInLesson();
    type("Experience");
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saveReflectionAction).toHaveBeenCalledWith({
      blockId: BLOCK,
      answer: "Experience",
    });
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      ["Perfection", "Experience"],
    );
  });

  it("says when saving fails", async () => {
    saveReflectionAction.mockResolvedValueOnce({ ok: false, error: "locked" });
    renderInLesson();
    type("Something");
    await act(() => vi.advanceTimersByTimeAsync(REFLECTION_SAVE_DELAY_MS));
    expect(box()).toHaveAccessibleDescription(
      "We couldn't save your answer. Keep typing to try again.",
    );
  });

  it("never saves outside a lesson", async () => {
    render(<ReflectionBlock {...props} />);
    type("Preview answer");
    fireEvent.blur(box());
    await act(() => vi.advanceTimersByTimeAsync(REFLECTION_SAVE_DELAY_MS));
    expect(saveReflectionAction).not.toHaveBeenCalled();
  });
});
