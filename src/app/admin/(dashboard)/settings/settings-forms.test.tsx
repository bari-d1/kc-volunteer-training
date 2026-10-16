import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
const actions = vi.hoisted(() => ({
  saveSafeguardingAction: vi.fn(async () => ({ ok: true })),
  saveWhatsappAction: vi.fn(async () => ({ ok: true })),
  saveQuizAction: vi.fn(async () => ({ ok: true })),
  saveEmailsAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./actions", () => actions);

const forms = await import("./settings-forms");

beforeEach(() => vi.clearAllMocks());

describe("settings forms", () => {
  it("checks questions per attempt against the bank as you type", async () => {
    render(
      <forms.QuizSettingsForm
        initial={{ passMark: 80, questionsPerAttempt: 10 }}
        bank={{ drawUnits: 40, required: 1 }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "40 different questions to draw from",
    );
    const perAttempt = screen.getByRole("spinbutton", {
      name: "Questions per attempt",
    });
    fireEvent.change(perAttempt, { target: { value: "41" } });
    expect(screen.getByRole("status")).toHaveTextContent("Too many");
    expect(
      screen.getByRole("button", { name: "Save quiz settings" }),
    ).toBeDisabled();
    fireEvent.change(perAttempt, { target: { value: "12" } });
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Save quiz settings" }),
      ),
    );
    expect(actions.saveQuizAction).toHaveBeenCalledWith({
      passMark: 80,
      questionsPerAttempt: 12,
    });
  });

  it("saves the WhatsApp link, or removes it when empty", async () => {
    render(<forms.LinksSettingsForm initial="https://chat.whatsapp.com/abc" />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Volunteers' WhatsApp group link" }),
      {
        target: { value: "" },
      },
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Save links" })),
    );
    expect(actions.saveWhatsappAction).toHaveBeenCalledWith({
      whatsappUrl: undefined,
    });
  });

  it("shows field errors from the server next to the field", async () => {
    actions.saveSafeguardingAction.mockResolvedValueOnce({
      ok: false,
      error: "Some fields need fixing.",
      fieldErrors: { email: "Invalid email address" },
    } as never);
    render(
      <forms.SafeguardingSettingsForm
        initial={{
          email: "x",
          contacts: [{ label: "DSL", name: "Yemi" }],
          incidentFormUrl: "https://f.example",
        }}
      />,
    );
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Save safeguarding" }),
      ),
    );
    expect(
      screen.getByRole("textbox", { name: "Safeguarding email" }),
    ).toHaveAccessibleDescription("Invalid email address");
  });

  it("splits digest recipients one per line", async () => {
    render(
      <forms.EmailSettingsForm
        initial={{ remindersEnabled: true, digestRecipients: [] }}
        envDigestCount={2}
      />,
    );
    expect(screen.getByText(/2 addresses in ADMIN_DIGEST_TO/)).toBeVisible();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Send reminder emails" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Admin digest recipients" }),
      {
        target: { value: "a@kc.example\n\n b@kc.example " },
      },
    );
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Save email settings" }),
      ),
    );
    expect(actions.saveEmailsAction).toHaveBeenCalledWith({
      remindersEnabled: false,
      digestRecipients: ["a@kc.example", "b@kc.example"],
    });
  });
});
