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
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
const revealed = () => screen.queryByText("What isn't required");

beforeEach(() => {
  vi.useFakeTimers();
  saveReflectionAction.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("saving reflection answers", () => {
  it("fills in a saved answer, with KC's answer already showing", () => {
    renderInLesson({ [BLOCK]: "A willing heart" });
    expect(box()).toHaveValue("A willing heart");
    expect(revealed()).toBeInTheDocument();
  });

  it("saves on Save, says Saved and reveals KC's answer as a list", async () => {
    renderInLesson();
    expect(revealed()).toBeNull();
    type("Experience");
    save();
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(saveReflectionAction).toHaveBeenCalledWith({
      blockId: BLOCK,
      answer: "Experience",
    });
    expect(screen.getByText("Saved")).toBeVisible();
    expect(revealed()).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      ["Perfection", "Experience"],
    );
  });

  it("can't be saved empty", () => {
    renderInLesson();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    type("   ");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("also saves quietly in the background, without a message", async () => {
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
    expect(screen.queryByText("Saved")).toBeNull();
    expect(revealed()).toBeNull();

    // Save afterwards doesn't send it again, but confirms it.
    save();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saveReflectionAction).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Saved")).toBeVisible();
  });

  it("says when saving fails", async () => {
    saveReflectionAction.mockResolvedValueOnce({ ok: false, error: "locked" });
    renderInLesson();
    type("Something");
    save();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(
      screen.getByText("We couldn't save your answer. Please try again."),
    ).toBeVisible();
  });

  it("never saves outside a lesson", async () => {
    render(<ReflectionBlock {...props} />);
    type("Preview answer");
    save();
    fireEvent.blur(box());
    await act(() => vi.advanceTimersByTimeAsync(REFLECTION_SAVE_DELAY_MS));
    expect(saveReflectionAction).not.toHaveBeenCalled();
    expect(revealed()).toBeInTheDocument();
  });
});
