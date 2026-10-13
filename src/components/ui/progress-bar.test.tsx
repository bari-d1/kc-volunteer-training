import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "@/components/ui/progress-bar";

describe("ProgressBar", () => {
  it("exposes progressbar semantics", () => {
    render(<ProgressBar value={40} label="Module progress" />);

    const bar = screen.getByRole("progressbar", { name: "Module progress" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuetext", "40%");
  });

  it("sizes the fill relative to max", () => {
    render(<ProgressBar value={3} max={4} label="Lessons" />);

    const bar = screen.getByRole("progressbar", { name: "Lessons" });
    expect(bar.firstElementChild).toHaveStyle({ width: "75%" });
    expect(bar).toHaveAttribute("aria-valuetext", "75%");
  });

  it("clamps out-of-range values", () => {
    const { rerender } = render(<ProgressBar value={150} label="Progress" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar.firstElementChild).toHaveStyle({ width: "100%" });

    rerender(<ProgressBar value={-10} label="Progress" />);
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar.firstElementChild).toHaveStyle({ width: "0%" });
  });
});
