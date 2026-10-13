import { render, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "@/components/ui/progress-bar";

// skipAnimations is what reduced-motion users get: final width, no tween.
function renderInstant(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MotionConfig skipAnimations>{children}</MotionConfig>
    ),
  });
}

describe("ProgressBar", () => {
  it("exposes progressbar semantics", () => {
    render(<ProgressBar value={40} label="Module progress" />);

    const bar = screen.getByRole("progressbar", { name: "Module progress" });
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuetext", "40%");
  });

  it("sizes the fill relative to max", async () => {
    renderInstant(<ProgressBar value={3} max={4} label="Lessons" />);

    const bar = screen.getByRole("progressbar", { name: "Lessons" });
    await waitFor(() =>
      expect(bar.firstElementChild).toHaveStyle({ width: "75%" }),
    );
    expect(bar).toHaveAttribute("aria-valuetext", "75%");
  });

  it("clamps out-of-range values", async () => {
    const { rerender } = renderInstant(
      <ProgressBar value={150} label="Progress" />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    await waitFor(() =>
      expect(bar.firstElementChild).toHaveStyle({ width: "100%" }),
    );

    rerender(<ProgressBar value={-10} label="Progress" />);
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    await waitFor(() =>
      expect(bar.firstElementChild).toHaveStyle({ width: "0%" }),
    );
  });
});
