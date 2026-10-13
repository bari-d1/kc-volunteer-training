import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SignInState } from "@/lib/auth-actions";

const signInWithMagicLink =
  vi.fn<(s: SignInState, f: FormData) => Promise<SignInState>>();
vi.mock("@/lib/auth-actions", () => ({ signInWithMagicLink }));

const { SignInForm } = await import("./sign-in-form");

describe("SignInForm", () => {
  it("sends the email and next path, then shows the check-your-email state", async () => {
    signInWithMagicLink.mockResolvedValueOnce({
      status: "sent",
      email: "ada@example.com",
    });
    render(<SignInForm next="/course/about-kc" />);

    await userEvent.type(
      screen.getByLabelText("Email address"),
      "ada@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send me a link" }),
    );

    const formData = signInWithMagicLink.mock.calls[0][1];
    expect(formData.get("email")).toBe("ada@example.com");
    expect(formData.get("next")).toBe("/course/about-kc");
    expect(
      await screen.findByRole("heading", { name: "Check your email" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("shows a friendly error and keeps the typed email", async () => {
    signInWithMagicLink.mockResolvedValueOnce({
      status: "error",
      email: "ada@example",
      message: "That doesn't look like an email address.",
    });
    render(<SignInForm next="/course" />);

    await userEvent.type(screen.getByLabelText("Email address"), "ada@example");
    await userEvent.click(
      screen.getByRole("button", { name: "Send me a link" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That doesn't look like an email address.",
    );
    const input = screen.getByLabelText("Email address");
    expect(input).toHaveValue("ada@example");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "That doesn't look like an email address.",
    );
  });

  it("shows an error passed in from an expired link", () => {
    render(<SignInForm next="/course" initialError="That link has expired." />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That link has expired.",
    );
  });
});
