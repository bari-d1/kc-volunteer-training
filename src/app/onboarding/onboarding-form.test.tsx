import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { OnboardingState } from "./actions";

const completeOnboarding =
  vi.fn<(s: OnboardingState, f: FormData) => Promise<OnboardingState>>();
vi.mock("./actions", () => ({ completeOnboarding }));

const { OnboardingForm } = await import("./onboarding-form");

const branches = [
  { value: "EXPERIENCE", label: "Experience" },
  {
    value: "MINISTRY",
    label: "Ministry",
    description: "Prayer and pastoral care",
  },
  { value: "CREATIVE", label: "Creative" },
  { value: "SYSTEMS", label: "Systems" },
  { value: "NOT_SURE", label: "Not sure yet" },
];
const teams = [
  { id: "t1", name: "Prayer Team", branch: "MINISTRY" },
  { id: "t2", name: "Hosting", branch: "EXPERIENCE" },
  { id: "t3", name: "Welcome", branch: "EXPERIENCE" },
];

function renderForm() {
  return render(<OnboardingForm branches={branches} teams={teams} />);
}

describe("OnboardingForm", () => {
  it("labels every field", () => {
    renderForm();
    expect(screen.getByLabelText("First name")).toBeRequired();
    expect(screen.getByLabelText("Last name")).toBeRequired();
    expect(
      screen.getByRole("group", { name: "Which branch interests you?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Not sure yet/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Team interest (optional)")).toBeDisabled();
    expect(
      screen.getByRole("checkbox", {
        name: /I agree to KC storing my details/,
      }),
    ).toBeRequired();
    expect(
      screen.getByRole("link", { name: /Privacy notice/ }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("lists only active teams for the chosen branch", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("radio", { name: /Experience/ }));

    const select = screen.getByLabelText("Team interest (optional)");
    expect(select).toBeEnabled();
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["No preference yet", "Hosting", "Welcome"]);

    await userEvent.click(screen.getByRole("radio", { name: /Creative/ }));
    expect(screen.getByLabelText("Team interest (optional)")).toBeDisabled();
    expect(
      screen.getByText(/No teams listed for this branch yet/),
    ).toBeInTheDocument();
  });

  it("submits the chosen values", async () => {
    completeOnboarding.mockResolvedValueOnce({ status: "idle" });
    renderForm();
    await userEvent.type(screen.getByLabelText("First name"), "Ada");
    await userEvent.type(screen.getByLabelText("Last name"), "Okafor");
    await userEvent.click(screen.getByRole("radio", { name: /Ministry/ }));
    await userEvent.selectOptions(
      screen.getByLabelText("Team interest (optional)"),
      "Prayer Team",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Start my training" }),
    );

    const data = completeOnboarding.mock.calls[0][1];
    expect(Object.fromEntries(data)).toEqual({
      firstName: "Ada",
      lastName: "Okafor",
      branchInterest: "MINISTRY",
      teamId: "t1",
      consent: "on",
    });
  });

  it("shows server errors next to their fields and keeps values", async () => {
    completeOnboarding.mockResolvedValueOnce({
      status: "error",
      values: {
        firstName: "Ada",
        lastName: "",
        branchInterest: "MINISTRY",
        teamId: "",
        consent: false,
      },
      errors: {
        lastName: "Enter your last name",
        consent: "Please agree so we can track your training",
      },
    });
    renderForm();
    await userEvent.click(
      screen.getByRole("button", { name: "Start my training" }),
    );

    await screen.findByText("Enter your last name");
    const lastName = screen.getByLabelText("Last name");
    expect(lastName).toHaveAttribute("aria-invalid", "true");
    expect(lastName).toHaveAccessibleDescription("Enter your last name");
    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    expect(screen.getByRole("radio", { name: /Ministry/ })).toBeChecked();
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription(
      "Please agree so we can track your training",
    );
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });
});
