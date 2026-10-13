import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  it("is clearly marked as a draft", () => {
    render(<PrivacyPage />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Draft, to be reviewed by KC.",
    );
  });

  it("covers every required section", () => {
    render(<PrivacyPage />);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      "Who we are",
      "What we collect",
      "Why we collect it",
      "How long we keep it",
      "Who can see it",
      "Your rights",
      "Contact us",
    ]);
    expect(
      screen.getByText(/Jubilee Church Manchester \(RCCG\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 years/)).toBeInTheDocument();
  });
});
