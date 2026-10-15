import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SubmittedAttempt } from "@/server/quiz";
import { orderResults, QuizResults } from "./quiz-results";

const options = [
  { id: "a", text: "Kingdom" },
  { id: "b", text: "Comfort" },
];
const question = (n: number, correct: boolean, explanation = `Why ${n}`) => ({
  questionId: `q${n}`,
  prompt: `Prompt ${n}?`,
  options,
  selectedOptionId: correct ? "a" : "b",
  correctOptionId: "a",
  correct,
  explanation,
});

function attempt(overrides: Partial<SubmittedAttempt> = {}): SubmittedAttempt {
  return {
    attemptId: "x",
    score: 8,
    total: 10,
    passMark: 80,
    passed: true,
    certificateNumber: "KC-2026-000123",
    results: [question(1, true), question(2, false), question(3, true)],
    ...overrides,
  };
}

function renderResults(result = attempt(), onRetry = vi.fn()) {
  render(
    <QuizResults
      result={result}
      headingRef={createRef()}
      modulesHref="/course/kc"
      next={{ href: "/course/kc/part-of-the-family", title: "Family" }}
      onRetry={onRetry}
      retrying={false}
      error={null}
    />,
  );
  return onRetry;
}

describe("QuizResults", () => {
  it("shows the score as a ring reading 8 out of 10", () => {
    renderResults();
    const ring = screen.getByRole("progressbar", { name: "Your score" });
    expect(ring).toHaveAttribute("aria-valuenow", "8");
    expect(ring).toHaveAttribute("aria-valuemax", "10");
    expect(ring).toHaveAttribute("aria-valuetext", "8 out of 10");
    expect(screen.getByText("8 out of 10")).toBeVisible();
  });

  it("leads on to the rest of the training after a pass, with the PDF second", () => {
    renderResults();
    expect(
      screen.getByRole("heading", { name: "You passed!" }),
    ).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Finish your training →",
      "Download certificate (PDF)",
    ]);
    expect(links[0]).toHaveAttribute("href", "/course/kc/part-of-the-family");
    expect(links[0]).toHaveClass("bg-lime");
    expect(links[1]).toHaveAttribute(
      "href",
      "/api/certificates/KC-2026-000123/pdf",
    );
    expect(links[1]).toHaveAttribute("download");
    expect(links[1]).not.toHaveClass("bg-lime");
    expect(
      screen.getByText("See your certificate and what happens next."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Try again/ })).toBeNull();
  });

  it("makes the PDF the main action if there's nowhere to continue", () => {
    render(
      <QuizResults
        result={attempt()}
        headingRef={createRef()}
        modulesHref="/course/kc"
        next={null}
        onRetry={vi.fn()}
        retrying={false}
        error={null}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Download certificate (PDF)" }),
    ).toHaveClass("bg-lime");
  });

  it("offers a fresh retry first after a fail, then revision", async () => {
    const onRetry = renderResults(
      attempt({ passed: false, score: 7, certificateNumber: null }),
    );
    expect(
      screen.getByRole("heading", { name: "Not quite this time" }),
    ).toBeInTheDocument();
    const retry = screen.getByRole("button", {
      name: "Try again with new questions",
    });
    expect(retry).toHaveClass("bg-lime");
    expect(
      screen.getByRole("link", { name: "Revise the modules first" }),
    ).toHaveAttribute("href", "/course/kc");
    expect(screen.getByText(/You need 80% to pass/)).toBeVisible();
    expect(screen.queryByRole("link", { name: /certificate/ })).toBeNull();
    await userEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lists missed questions first with the answer, correct answer and explanation", () => {
    renderResults();
    const items = screen.getAllByRole("listitem");
    expect(
      items.map((i) => within(i).getByText(/^Prompt/).textContent),
    ).toEqual(["Prompt 2?", "Prompt 1?", "Prompt 3?"]);
    const missed = items[0];
    expect(within(missed).getByText(/Question 2/)).toBeVisible();
    expect(within(missed).getByText("Missed")).toBeVisible();
    expect(within(missed).getByText("Comfort")).toBeVisible();
    const correct = within(missed).getByText("Kingdom");
    expect(correct).toHaveClass("border-lime");
    expect(within(missed).getByText("Why 2")).toBeVisible();
  });

  it("keeps question numbers when reordering", () => {
    expect(
      orderResults([question(1, true), question(2, false)]).map((r) => [
        r.questionId,
        r.number,
      ]),
    ).toEqual([
      ["q2", 2],
      ["q1", 1],
    ]);
  });
});
