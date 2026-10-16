import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
const actions = vi.hoisted(() => ({
  saveQuestionAction: vi.fn(async (): Promise<unknown> => ({
    ok: true,
    data: { id: "Q98" },
  })),
  deleteQuestionAction: vi.fn(async () => ({ ok: true, data: undefined })),
}));
vi.mock("./actions", () => actions);

const { QuestionForm } = await import("./question-form");

const sections = [
  { topic: "about-kc", title: "About KC" },
  { topic: "our-values", title: "Values" },
];

beforeEach(() => vi.clearAllMocks());

describe("QuestionForm", () => {
  it("adds a variation to a group with the chosen correct answer", async () => {
    render(
      <QuestionForm
        id="Q98"
        question={null}
        defaults={{ topic: "our-values", group: "values-list" }}
        sections={sections}
        groups={["values-list"]}
        used={false}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Question" }), {
      target: { value: "Which is a value?" },
    });
    ["Honour", "Speed", "Luck", "Noise"].forEach((text, i) =>
      fireEvent.change(
        screen.getByRole("textbox", { name: `Answer ${i + 1}` }),
        { target: { value: text } },
      ),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "Correct answer: answer 1" }),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Add Q98" })),
    );
    expect(actions.saveQuestionAction).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        topic: "our-values",
        group: "values-list",
        correctOptionId: "a",
        options: expect.arrayContaining([{ id: "a", text: "Honour" }]),
      }),
    );
    expect(push).toHaveBeenCalledWith("/admin/quiz");
  });

  it("clears the correct answer when that answer is removed, and caps answers at 6", () => {
    render(
      <QuestionForm
        id="Q01"
        question={{
          id: "Q01",
          topic: "about-kc",
          prompt: "P?",
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" },
          ],
          correctOptionId: "c",
          explanation: "",
          required: false,
          active: true,
        }}
        sections={sections}
        groups={[]}
        used
      />,
    );
    expect(
      screen.getByRole("radio", { name: "Correct answer: answer 3" }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Remove answer 3" }));
    expect(
      screen.getAllByRole("radio").some((r) => (r as HTMLInputElement).checked),
    ).toBe(false);
    for (let i = 0; i < 4; i++)
      fireEvent.click(screen.getByRole("button", { name: "+ Add answer" }));
    expect(screen.queryByRole("button", { name: "+ Add answer" })).toBeNull();
    // Used in an attempt: no delete, only deactivate.
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
    expect(screen.getByText(/can’t be deleted/)).toBeVisible();
  });

  it("shows bank rule errors from the server on the field", async () => {
    actions.saveQuestionAction.mockResolvedValueOnce({
      ok: false,
      error: "x",
      fieldErrors: { required: "“g” already has a required question (Q02)." },
    });
    render(
      <QuestionForm
        id="Q01"
        question={{
          id: "Q01",
          topic: "about-kc",
          group: "g",
          prompt: "P?",
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
          ],
          correctOptionId: "a",
          explanation: "",
          required: true,
          active: true,
        }}
        sections={sections}
        groups={["g"]}
        used={false}
      />,
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Save question" })),
    );
    expect(
      screen.getByRole("checkbox", { name: "Required" }),
    ).toHaveAccessibleDescription(/already has a required question/);
  });
});
