import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const startQuizAction = vi.fn();
const submitQuizAction = vi.fn();
vi.mock("@/app/actions/quiz", () => ({
  startQuizAction: (slug: string) => startQuizAction(slug),
  submitQuizAction: (input: unknown) => submitQuizAction(input),
}));

const narrator = vi.hoisted(() => ({
  available: true,
  present: true,
  say: vi.fn(),
  setState: vi.fn(),
  dismiss: vi.fn(),
}));
vi.mock("@/components/narrator/narrator-context", () => ({
  useNarrator: () => narrator,
}));

const { FinalQuiz } = await import("./final-quiz");

const ATTEMPT = "11111111-1111-4111-8111-111111111111";
const questions = [1, 2, 3].map((n) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  prompt: `Question prompt ${n}?`,
  options: [
    { id: "a", text: `Answer ${n}A` },
    { id: "b", text: `Answer ${n}B` },
    { id: "c", text: `Answer ${n}C` },
  ],
}));

function renderQuiz(props: Partial<Parameters<typeof FinalQuiz>[0]> = {}) {
  return render(
    <FinalQuiz
      courseSlug="volunteers-onboarding"
      questionsPerAttempt={10}
      passMark={80}
      hasOpenAttempt={false}
      next={{ href: "/course/kc/part-of-the-family", title: "Family" }}
      {...props}
    />,
  );
}

async function startQuiz() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Start quiz" }));
  await screen.findByText("Question 1 of 3");
  return user;
}

const option = (name: string) => screen.getByRole("radio", { name });
const nextButton = () => screen.getByRole("button", { name: /^Next/ });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  startQuizAction.mockResolvedValue({
    ok: true,
    attemptId: ATTEMPT,
    questions,
  });
});

describe("intro", () => {
  it("shows the question count, pass mark and retake note, with the narrator waving", () => {
    renderQuiz();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(
      screen.getByText("You can retake it as many times as you need."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeEnabled();
    expect(narrator.say).toHaveBeenCalledWith(
      expect.any(String),
      "wave",
      expect.objectContaining({ key: "quiz:intro" }),
    );
  });

  it("offers to resume an unfinished attempt", () => {
    renderQuiz({ hasOpenAttempt: true });
    expect(screen.getByRole("button", { name: "Resume quiz" })).toBeEnabled();
  });

  it("explains why the quiz can't start", async () => {
    startQuizAction.mockResolvedValue({ ok: false, error: "locked" });
    renderQuiz();
    await userEvent.click(screen.getByRole("button", { name: "Start quiz" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Complete every module before taking the quiz.",
    );
  });
});

describe("answering", () => {
  it("shows one question at a time with progress, and focuses its heading", async () => {
    renderQuiz();
    await startQuiz();
    expect(startQuizAction).toHaveBeenCalledWith("volunteers-onboarding");
    const heading = screen.getByRole("heading", { name: /Question prompt 1/ });
    expect(heading).toHaveFocus();
    expect(
      screen.getByRole("progressbar", { name: "Quiz progress" }),
    ).toHaveAttribute("aria-valuenow", "1");
    expect(
      screen.getByRole("radiogroup", { name: /Question prompt 1/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByText("Question prompt 2?")).toBeNull();
    expect(narrator.setState).toHaveBeenCalledWith("think");
  });

  it("selects options with the arrow keys", async () => {
    renderQuiz();
    const user = await startQuiz();
    await user.click(option("Answer 1A"));
    expect(option("Answer 1A")).toBeChecked();
    await user.keyboard("{ArrowDown}");
    expect(option("Answer 1B")).toBeChecked();
    expect(option("Answer 1B")).toHaveFocus();
  });

  it("moves with Back and Next, keeping answers and moving focus", async () => {
    renderQuiz();
    const user = await startQuiz();
    expect(screen.queryByRole("button", { name: /Back/ })).toBeNull();
    await user.click(option("Answer 1C"));
    await user.click(nextButton());
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Question prompt 2/ }),
    ).toHaveFocus();
    await user.click(screen.getByRole("button", { name: /Back/ }));
    expect(option("Answer 1C")).toBeChecked();
  });

  it("never says whether an answer is right before submitting", async () => {
    renderQuiz();
    const user = await startQuiz();
    await user.click(option("Answer 1A"));
    expect(screen.queryByText(/correct|incorrect|not quite/i)).toBeNull();
    expect(narrator.say).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/celebrate|encourage/),
    );
  });

  it("keeps answers across a refresh via sessionStorage", async () => {
    const { unmount } = renderQuiz();
    const user = await startQuiz();
    await user.click(option("Answer 1B"));
    await user.click(nextButton());
    await user.click(option("Answer 2C"));
    unmount();

    renderQuiz({ hasOpenAttempt: true });
    await user.click(screen.getByRole("button", { name: "Resume quiz" }));
    // Resumes at the first unanswered question.
    expect(await screen.findByText("Question 3 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Back/ }));
    expect(option("Answer 2C")).toBeChecked();
  });

  it("ignores saved answers that don't fit the questions", async () => {
    sessionStorage.setItem(
      `kc:quiz:${ATTEMPT}`,
      JSON.stringify({ [questions[0].id]: "zzz", nope: "a" }),
    );
    renderQuiz();
    await startQuiz();
    expect(
      screen.getAllByRole("radio").some((r) => r.matches(":checked")),
    ).toBe(false);
  });

  it("still works when sessionStorage is blocked", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    renderQuiz();
    const user = await startQuiz();
    await user.click(option("Answer 1A"));
    expect(option("Answer 1A")).toBeChecked();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("review and submit", () => {
  async function reachReview(answerAll: boolean) {
    renderQuiz();
    const user = await startQuiz();
    await user.click(option("Answer 1A"));
    await user.click(nextButton());
    if (answerAll) await user.click(option("Answer 2B"));
    await user.click(nextButton());
    await user.click(option("Answer 3C"));
    await user.click(screen.getByRole("button", { name: "Review answers" }));
    await screen.findByRole("heading", { name: "Review your answers" });
    return user;
  }

  it("lists every answer, highlights unanswered ones and blocks submitting", async () => {
    await reachReview(false);
    expect(
      screen.getByRole("heading", { name: "Review your answers" }),
    ).toHaveFocus();
    expect(screen.getByText("Your answer: Answer 1A")).toBeInTheDocument();
    expect(screen.getByText("Not answered")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "1 question still needs an answer before you can submit.",
    );
    expect(
      screen.getByRole("button", { name: "Submit answers" }),
    ).toBeDisabled();
  });

  it("goes back to a question from review and returns", async () => {
    const user = await reachReview(false);
    await user.click(screen.getByRole("button", { name: /Question prompt 2/ }));
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
    await user.click(option("Answer 2A"));
    await user.click(screen.getByRole("button", { name: "Back to review" }));
    expect(screen.getByText("Your answer: Answer 2A")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Submit answers" }),
    ).toBeEnabled();
  });

  it("submits every answer and shows the marked result", async () => {
    submitQuizAction.mockResolvedValue({
      ok: true,
      attemptId: ATTEMPT,
      score: 2,
      total: 3,
      passMark: 80,
      passed: false,
      certificateNumber: null,
      results: questions.map((q, i) => ({
        questionId: q.id,
        prompt: q.prompt,
        options: q.options,
        selectedOptionId: ["a", "b", "c"][i],
        correctOptionId: i === 0 ? "b" : ["a", "b", "c"][i],
        correct: i !== 0,
        explanation: `Explanation ${i + 1}`,
      })),
    });
    const user = await reachReview(true);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));

    expect(submitQuizAction).toHaveBeenCalledWith({
      attemptId: ATTEMPT,
      answers: [
        { questionId: questions[0].id, optionId: "a" },
        { questionId: questions[1].id, optionId: "b" },
        { questionId: questions[2].id, optionId: "c" },
      ],
    });
    const heading = await screen.findByRole("heading", {
      name: "Not quite this time",
    });
    expect(heading).toHaveFocus();
    expect(
      screen.getByText(/You scored 2 out of 3 \(67%\)/),
    ).toBeInTheDocument();
    const first = screen.getAllByRole("listitem")[0];
    expect(within(first).getByText("Correct answer: Answer 1B")).toBeVisible();
    expect(within(first).getByText("Explanation 1")).toBeVisible();
    expect(sessionStorage.getItem(`kc:quiz:${ATTEMPT}`)).toBeNull();
    expect(narrator.say).toHaveBeenCalledWith(expect.any(String), "encourage");

    // Retaking starts a fresh attempt.
    await user.click(screen.getByRole("button", { name: "Retake quiz" }));
    await waitFor(() => expect(startQuizAction).toHaveBeenCalledTimes(2));
  });

  it("celebrates a pass and links on", async () => {
    submitQuizAction.mockResolvedValue({
      ok: true,
      attemptId: ATTEMPT,
      score: 3,
      total: 3,
      passMark: 80,
      passed: true,
      certificateNumber: "KC-2026-000001",
      results: [],
    });
    const user = await reachReview(true);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));
    expect(
      await screen.findByRole("heading", { name: "You passed!" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Certificate number KC-2026-000001")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Continue: Family" }),
    ).toHaveAttribute("href", "/course/kc/part-of-the-family");
    expect(narrator.say).toHaveBeenCalledWith(expect.any(String), "celebrate");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a server error without losing the answers", async () => {
    submitQuizAction.mockResolvedValue({
      ok: false,
      error: "already-submitted",
    });
    const user = await reachReview(true);
    await user.click(screen.getByRole("button", { name: "Submit answers" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This attempt has already been submitted.",
    );
    expect(screen.getByText("Your answer: Answer 1A")).toBeInTheDocument();
  });
});
