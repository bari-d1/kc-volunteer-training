import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  BranchChart,
  ModuleFunnelChart,
  WeeklySignupsChart,
} from "./overview-charts";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("overview charts", () => {
  it("give screen readers the funnel as a table", () => {
    render(
      <ModuleFunnelChart
        data={[
          { label: "Signed up", count: 10 },
          { label: "1. Welcome", count: 8 },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Where volunteers stop" });
    expect(
      within(table).getByRole("row", { name: "1. Welcome 8" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveTextContent(
      "Where volunteers stop",
    );
  });

  it("label weeks by their Monday", () => {
    render(
      <WeeklySignupsChart
        data={[{ weekStart: new Date("2026-10-12T00:00:00Z"), count: 3 }]}
      />,
    );
    expect(
      within(
        screen.getByRole("table", { name: "Sign-ups over time" }),
      ).getByRole("row", { name: "12 Oct 3" }),
    ).toBeInTheDocument();
  });

  it("list every branch", () => {
    render(
      <BranchChart
        data={[
          { code: "EXPERIENCE", label: "Experience", count: 2 },
          { code: null, label: "Not sure yet", count: 1 },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Branch interest" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });
});
