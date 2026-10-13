import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/course/kc",
}));
const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast }) }));

const { DashboardNotice, isDashboardNotice } =
  await import("./dashboard-notice");

describe("DashboardNotice", () => {
  it("shows the locked toast once and clears the query string", () => {
    const { rerender } = render(<DashboardNotice notice="locked" />);
    rerender(<DashboardNotice notice="locked" />);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({
      title: "Finish the previous module first",
      variant: "info",
    });
    expect(replace).toHaveBeenCalledWith("/course/kc", { scroll: false });
  });

  it("only accepts known notices", () => {
    expect(isDashboardNotice("locked")).toBe(true);
    expect(isDashboardNotice("<script>")).toBe(false);
    expect(isDashboardNotice(undefined)).toBe(false);
  });
});
