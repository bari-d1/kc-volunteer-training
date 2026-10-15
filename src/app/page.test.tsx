import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("welcomes visitors and says what the course covers", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Welcome to the Spiritual Costco",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("starts the training, or signs in to pick up again", () => {
    render(<Home />);
    expect(
      screen.getByRole("link", { name: "Start your training" }),
    ).toHaveAttribute("href", "/course");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });
});
