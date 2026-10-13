import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders a button with type=button by default and handles clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies variant and size classes", () => {
    render(
      <Button variant="secondary" size="lg">
        Next
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Next" });
    expect(button).toHaveClass("border-lime", "h-14");
  });

  it("is disabled and busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders as a link when given href", () => {
    render(<Button href="/modules">Start</Button>);
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute(
      "href",
      "/modules",
    );
  });

  it("renders a disabled link without an href", () => {
    render(
      <Button href="/modules" disabled>
        Start
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Start" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).not.toHaveAttribute("href");
  });
});
