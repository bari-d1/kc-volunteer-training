import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const answers: Record<number, string> = { 0: "dsl", 1: "now" };
const checkKnowledgeAnswer = vi.fn(
  async ({
    questionIndex,
    optionId,
  }: {
    questionIndex: number;
    optionId: string;
  }) => ({
    ok: true as const,
    correct: answers[questionIndex] === optionId,
    explanation: `Explanation ${questionIndex + 1}`,
  }),
);
const completeKnowledgeCheck = vi.fn(async () => ({
  ok: true as const,
  blockPassed: true,
  modulePassed: true,
}));
vi.mock("@/app/actions/knowledge-check", () => ({
  checkKnowledgeAnswer,
  completeKnowledgeCheck,
}));

const { KnowledgeCheckBlock, KNOWLEDGE_CHECK_PASSED_EVENT } =
  await import("./knowledge-check-block");

const questions = [
  {
    prompt: "Who do you tell?",
    options: [
      { id: "dsl", text: "The DSL" },
      { id: "nobody", text: "Nobody" },
    ],
  },
  {
    prompt: "When?",
    options: [
      { id: "now", text: "Straight away" },
      { id: "later", text: "Next week" },
    ],
  },
];

beforeEach(() => vi.clearAllMocks());

describe("KnowledgeCheckBlock", () => {
  it("shows one question at a time as a radio group", () => {
    render(
      <KnowledgeCheckBlock blockId="b1" moduleId="m1" questions={questions} />,
    );
    expect(
      screen.getByRole("group", { name: "Who do you tell?" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByText("When?")).toBeNull();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check answer" })).toBeDisabled();
  });

  it("lets volunteers retry until correct, then moves on and finishes", async () => {
    const onPassed = vi.fn();
    const event = vi.fn();
    window.addEventListener(KNOWLEDGE_CHECK_PASSED_EVENT, (e) =>
      event((e as CustomEvent).detail),
    );
    render(
      <KnowledgeCheckBlock
        blockId="b1"
        moduleId="m1"
        questions={questions}
        onPassed={onPassed}
      />,
    );

    // Wrong first.
    await userEvent.click(screen.getByRole("radio", { name: "Nobody" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("Not quite")).toBeInTheDocument();
    expect(screen.getByText("Explanation 1")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Nobody" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("radio", { name: "Nobody" })).not.toBeChecked();

    // Then right, using the keyboard.
    await userEvent.click(screen.getByRole("radio", { name: "The DSL" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(checkKnowledgeAnswer).toHaveBeenLastCalledWith({
      blockId: "b1",
      questionIndex: 0,
      optionId: "dsl",
    });

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("group", { name: "When?" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("When?")).toHaveFocus());

    await userEvent.click(screen.getByRole("radio", { name: "Straight away" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await userEvent.click(await screen.findByRole("button", { name: "Done" }));

    expect(
      await screen.findByText("Knowledge check complete"),
    ).toBeInTheDocument();
    expect(completeKnowledgeCheck).toHaveBeenCalledWith({
      blockId: "b1",
      answers: [
        { questionIndex: 0, optionId: "dsl" },
        { questionIndex: 1, optionId: "now" },
      ],
    });
    const passed = { blockId: "b1", moduleId: "m1", modulePassed: true };
    expect(onPassed).toHaveBeenCalledWith(passed);
    expect(event).toHaveBeenCalledWith(passed);
  });

  it("announces results in a live region", async () => {
    const { container } = render(
      <KnowledgeCheckBlock blockId="b1" moduleId="m1" questions={questions} />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "The DSL" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await screen.findByText("Correct");
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Explanation 1",
    );
  });

  it("shows a friendly error if checking fails", async () => {
    checkKnowledgeAnswer.mockRejectedValueOnce(new Error("network"));
    render(
      <KnowledgeCheckBlock blockId="b1" moduleId="m1" questions={questions} />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "The DSL" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn't check your answer",
    );
  });
});
