import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setGuideHidden = vi.fn<(hidden: boolean) => Promise<{ ok: boolean }>>(
  async () => ({ ok: true }),
);
vi.mock("@/app/actions/narrator", () => ({
  setGuideHidden: (h: boolean) => setGuideHidden(h),
}));
const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));

const { GuideSwitch } = await import("./guide-switch");

beforeEach(() => vi.clearAllMocks());

describe("GuideSwitch", () => {
  it("is a labelled switch that saves the new value straight away", async () => {
    render(<GuideSwitch initialHidden={false} />);
    const toggle = screen.getByRole("switch", { name: "Show the guide" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(setGuideHidden).toHaveBeenCalledWith(true);
  });

  it("flips back and explains when saving fails", async () => {
    setGuideHidden.mockResolvedValueOnce({ ok: false });
    render(<GuideSwitch initialHidden />);
    const toggle = screen.getByRole("switch", { name: "Show the guide" });
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(toggle).toHaveAttribute("aria-checked", "false"),
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "error" }),
    );
  });
});
