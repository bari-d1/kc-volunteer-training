import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildDashboard } from "@/lib/dashboard";
import { CourseDashboard } from "./course-dashboard";

const mod = (
  slug: string,
  title: string,
  status: "locked" | "in-progress" | "completed",
  opened = false,
) => ({
  id: slug,
  slug,
  title,
  summary: `About ${title}`,
  status,
  progress: status === "completed" || opened ? { completedAt: null } : null,
});

function renderDashboard(
  modules: ReturnType<typeof mod>[],
  certificate: { certificateNumber: string; issuedAt: Date } | null = null,
) {
  return render(
    <CourseDashboard
      courseSlug="volunteers-onboarding"
      firstName="Ada"
      dashboard={buildDashboard(modules)}
      certificate={certificate}
    />,
  );
}

describe("CourseDashboard", () => {
  it("welcomes the volunteer and offers Start before anything is done", () => {
    renderDashboard([
      mod("welcome", "Welcome", "in-progress"),
      mod("about-kc", "About KC", "locked"),
    ]);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome, Ada" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Volunteers training")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute(
      "href",
      "/course/volunteers-onboarding/welcome",
    );
    expect(
      screen.getByRole("progressbar", { name: "Course progress" }),
    ).toHaveAttribute("aria-valuenow", "0");
  });

  it("continues at the first incomplete unlocked module", () => {
    renderDashboard([
      mod("welcome", "Welcome", "completed"),
      mod("about-kc", "About KC", "in-progress", true),
      mod("values", "Our Values", "locked"),
    ]);
    expect(
      screen.getByRole("link", { name: "Continue: About KC" }),
    ).toHaveAttribute("href", "/course/volunteers-onboarding/about-kc");
    expect(screen.getByText("1 of 3 modules complete")).toBeInTheDocument();
  });

  it("shows a card per module; locked ones aren't links and explain why", () => {
    renderDashboard([
      mod("welcome", "Welcome", "completed"),
      mod("about-kc", "About KC", "in-progress", true),
      mod("values", "Our Values", "locked"),
    ]);
    const cards = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(cards).toHaveLength(3);

    expect(within(cards[0]).getByText("01")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Completed")).toBeInTheDocument();
    expect(within(cards[0]).getByRole("link")).toHaveAttribute(
      "href",
      "/course/volunteers-onboarding/welcome",
    );

    expect(within(cards[1]).getByText("In progress")).toBeInTheDocument();

    expect(within(cards[2]).queryByRole("link")).toBeNull();
    expect(within(cards[2]).getByText("Locked")).toBeInTheDocument();
    expect(
      within(cards[2]).getByText("Finish the previous module to unlock."),
    ).toBeInTheDocument();
  });

  it("celebrates when every module is complete", () => {
    renderDashboard([
      mod("welcome", "Welcome", "completed"),
      mod("part-of-the-family", "You're Part of the Family", "completed"),
    ]);
    expect(
      screen.getByRole("heading", { level: 1, name: "You did it, Ada!" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See what's next" }),
    ).toHaveAttribute(
      "href",
      "/course/volunteers-onboarding/part-of-the-family",
    );
    expect(screen.queryByRole("link", { name: /Continue|Start/ })).toBeNull();
  });

  it("shows an empty state when the course has no published modules", () => {
    renderDashboard([]);
    expect(
      screen.getByRole("heading", { name: "No modules yet" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("switches to a Completed hero with the certificate once passed", () => {
    renderDashboard(
      [
        mod("final-quiz", "Final Quiz", "completed"),
        mod("part-of-the-family", "You're Part of the Family", "in-progress"),
      ],
      {
        certificateNumber: "KC-2026-000007",
        issuedAt: new Date("2026-10-15T09:30:00Z"),
      },
    );
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "You did it, Ada!",
    });
    expect(
      within(heading.parentElement!).getByText("Completed"),
    ).toBeInTheDocument();
    expect(screen.getByText("KC-2026-000007")).toBeInTheDocument();
    expect(screen.getByText("15 October 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute(
      "href",
      "/api/certificates/KC-2026-000007/pdf",
    );
    expect(
      screen.getByRole("link", { name: "See your next steps" }),
    ).toHaveAttribute(
      "href",
      "/course/volunteers-onboarding/part-of-the-family",
    );
    expect(
      screen.queryByRole("progressbar", { name: "Course progress" }),
    ).toBeNull();
  });
});
