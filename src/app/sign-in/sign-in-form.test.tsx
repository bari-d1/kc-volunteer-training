import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CodeState, SignInState } from "@/lib/auth-actions";

const signInWithMagicLink =
  vi.fn<(s: SignInState, f: FormData) => Promise<SignInState>>();
const signInWithCode =
  vi.fn<(s: CodeState, f: FormData) => Promise<CodeState>>();
vi.mock("@/lib/auth-actions", () => ({ signInWithMagicLink, signInWithCode }));

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

  describe("signing in with the code on another device", () => {
    async function sent() {
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
      return screen.findByLabelText("6-digit code");
    }

    it("offers a code box that phones can autofill", async () => {
      const code = await sent();
      expect(code).toHaveAttribute("inputmode", "numeric");
      expect(code).toHaveAttribute("autocomplete", "one-time-code");
      expect(
        screen.getByText(/opened the email somewhere else, enter the code/),
      ).toBeInTheDocument();
    });

    it("sends the code with the email and next path", async () => {
      signInWithCode.mockResolvedValueOnce({ status: "idle" });
      const code = await sent();
      await userEvent.type(code, "123456");
      await userEvent.click(
        screen.getByRole("button", { name: "Sign in with code" }),
      );
      const formData = signInWithCode.mock.calls[0][1];
      expect(formData.get("email")).toBe("ada@example.com");
      expect(formData.get("code")).toBe("123456");
      expect(formData.get("next")).toBe("/course/about-kc");
    });

    it("explains a wrong or expired code", async () => {
      signInWithCode.mockResolvedValueOnce({
        status: "error",
        message: "That code isn't right or has expired.",
      });
      const code = await sent();
      await userEvent.type(code, "000000");
      await userEvent.click(
        screen.getByRole("button", { name: "Sign in with code" }),
      );
      expect(
        await screen.findByText(/isn't right or has expired/),
      ).toBeVisible();
      expect(code).toHaveAttribute("aria-invalid", "true");
    });
  });
});
