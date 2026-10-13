import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

class Redirect extends Error {}
class NotFound extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
  notFound: () => {
    throw new NotFound();
  },
  usePathname: () => "/course/kc/what-we-believe",
  useParams: () => ({}),
  useRouter: () => ({ push: () => {} }),
}));
vi.mock("@/app/actions/progress", () => ({}));
vi.mock("@/app/actions/knowledge-check", () => ({}));

const requireVolunteer = vi.fn(async () => ({
  id: "v1",
  firstName: "Ada",
  hideNarrator: false,
}));
vi.mock("@/lib/auth", () => ({ requireVolunteer: () => requireVolunteer() }));

const getPublishedCourse = vi.fn();
const getModuleForVolunteer = vi.fn();
vi.mock("@/server/courses", () => ({
  getPublishedCourse: (s: string) => getPublishedCourse(s),
  getModuleForVolunteer: (...a: unknown[]) => getModuleForVolunteer(...a),
}));

const pageModule = await import("./page");

async function renderLesson(moduleSlug: string) {
  const page = pageModule.default({
    params: Promise.resolve({ courseSlug: "kc", moduleSlug }),
  } as never);
  const inner = (
    page.props as {
      children: {
        type: (p: unknown) => Promise<React.ReactNode>;
        props: unknown;
      };
    }
  ).children;
  return render(await inner.type(inner.props));
}

const outline = [
  { slug: "welcome", title: "Welcome", status: "completed" },
  { slug: "what-we-believe", title: "What We Believe", status: "in-progress" },
  { slug: "final-quiz", title: "Final Quiz", status: "locked" },
];
const okLesson = (slug = "what-we-believe", overrides = {}) => ({
  status: "in-progress",
  module: {
    id: "11111111-1111-4111-8111-111111111111",
    slug,
    title: "What We Believe",
    summary: "Our core beliefs.",
    order: 1,
    narratorIntro: "Let's dig into what we believe.",
    requiresCheck: false,
  },
  blocks: [
    { id: "b1", type: "TEXT", order: 0, content: { markdown: "Lesson body" } },
  ],
  progress: null,
  previous: { slug: "welcome", title: "Welcome" },
  next: { slug: "final-quiz", title: "Final Quiz", status: "locked" },
  number: 2,
  outline,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  getPublishedCourse.mockResolvedValue({
    id: "c1",
    slug: "kc",
    title: "Volunteers' Onboarding",
  });
  getModuleForVolunteer.mockResolvedValue(okLesson());
});

describe("lesson page", () => {
  it("shows the header, narrator intro first, then the blocks and Continue", async () => {
    const { container } = await renderLesson("what-we-believe");
    expect(screen.getByText("Module 2")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "What We Believe" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Our core beliefs.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All modules" })).toHaveAttribute(
      "href",
      "/course/kc",
    );

    const types = [...container.querySelectorAll("[data-block-type]")].map(
      (el) => el.getAttribute("data-block-type"),
    );
    expect(types).toEqual(["NARRATOR_CALLOUT", "TEXT"]);
    expect(
      screen.getByText("Let's dig into what we believe."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue: Final Quiz" }),
    ).toBeInTheDocument();
  });

  it("builds the sidebar from real modules", async () => {
    await renderLesson("what-we-believe");
    const sidebar = screen.getByRole("complementary", {
      name: "Course modules",
    });
    expect(
      within(sidebar).getByRole("link", { name: /Welcome/ }),
    ).toHaveAttribute("href", "/course/kc/welcome");
    expect(
      within(sidebar).getByRole("link", { name: /What We Believe/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).queryByRole("link", { name: /Final Quiz/ }),
    ).toBeNull();
  });

  it("redirects locked modules to the dashboard with a notice", async () => {
    getModuleForVolunteer.mockResolvedValue({
      status: "locked",
      module: {},
      unlockedBy: null,
      outline,
    });
    await expect(renderLesson("final-quiz")).rejects.toMatchObject({
      message: "/course/kc?notice=locked",
    });
  });

  it("404s for unknown modules or courses", async () => {
    getModuleForVolunteer.mockResolvedValue({ status: "not-found" });
    await expect(renderLesson("nope")).rejects.toBeInstanceOf(NotFound);
    getPublishedCourse.mockResolvedValue(null);
    await expect(renderLesson("welcome")).rejects.toBeInstanceOf(NotFound);
  });

  it("shows the Phase 6 placeholder for the final quiz", async () => {
    getModuleForVolunteer.mockResolvedValue(
      okLesson("final-quiz", { next: null }),
    );
    await renderLesson("final-quiz");
    expect(
      screen.getByRole("heading", { name: "Coming in Phase 6" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Lesson body")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Finish and return to dashboard" }),
    ).toBeInTheDocument();
  });

  it("hides the narrator for volunteers who turned it off", async () => {
    requireVolunteer.mockResolvedValueOnce({
      id: "v1",
      firstName: "Ada",
      hideNarrator: true,
    });
    await renderLesson("what-we-believe");
    expect(screen.queryByText("Let's dig into what we believe.")).toBeNull();
  });
});
