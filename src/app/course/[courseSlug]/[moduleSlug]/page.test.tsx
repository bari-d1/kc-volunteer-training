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
vi.mock("@/app/actions/progress", () => ({
  completeModuleAction: async () => ({ ok: true, newlyCompleted: false }),
}));
vi.mock("@/app/actions/knowledge-check", () => ({}));
vi.mock("@/app/actions/quiz", () => ({}));
const getQuizIntro = vi.fn<
  (
    profileId: string,
    courseId: string,
  ) => Promise<{
    passMark: number;
    questionsPerAttempt: number;
    hasOpenAttempt: boolean;
  }>
>(async () => ({
  passMark: 80,
  questionsPerAttempt: 10,
  hasOpenAttempt: true,
}));
const getCertificate = vi.fn();
vi.mock("@/server/completion", () => ({
  COMPLETION_SLUG: "part-of-the-family",
  getCertificate: (...a: unknown[]) => getCertificate(...a),
  getPlacement: async () => ({
    branchName: "Creative",
    branchDescription: "Creativ // Bara.",
    colour: "creative",
    teamName: "Photography",
    leads: [{ name: "Maame Ama Acquah", role: "Creative Lead" }],
  }),
}));
vi.mock("@/server/quiz", () => ({
  FINAL_QUIZ_SLUG: "final-quiz",
  getQuizIntro: (p: string, c: string) => getQuizIntro(p, c),
}));
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: () => {} }),
}));

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
  { slug: "welcome", title: "Welcome", status: "completed", started: true },
  {
    slug: "what-we-believe",
    title: "What We Believe",
    status: "in-progress",
    started: true,
  },
  { slug: "final-quiz", title: "Final Quiz", status: "locked", started: false },
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

  it("shows the quiz instead of the lesson body for the final quiz", async () => {
    getModuleForVolunteer.mockResolvedValue(okLesson("final-quiz"));
    await renderLesson("final-quiz");
    expect(getQuizIntro).toHaveBeenCalledWith("v1", expect.any(String));
    expect(
      screen.getByRole("button", { name: "Resume quiz" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Lesson body")).toBeNull();
    // Only passing the quiz completes the module.
    expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
  });

  describe("the completion module", () => {
    const completion = () =>
      okLesson("part-of-the-family", {
        next: null,
        previous: { slug: "final-quiz", title: "Final Quiz" },
      });

    it("sends volunteers without a certificate to the quiz", async () => {
      getModuleForVolunteer.mockResolvedValue(completion());
      getCertificate.mockResolvedValue(null);
      await expect(renderLesson("part-of-the-family")).rejects.toMatchObject({
        message: "/course/kc/final-quiz",
      });
    });

    it("sends volunteers to the quiz while it's still locked", async () => {
      getModuleForVolunteer.mockResolvedValue({
        status: "locked",
        module: { id: "m", slug: "part-of-the-family", title: "Family" },
        unlockedBy: null,
        outline,
      });
      getCertificate.mockResolvedValue(null);
      await expect(renderLesson("part-of-the-family")).rejects.toMatchObject({
        message: "/course/kc/final-quiz",
      });
    });

    it("celebrates and shows the certificate and next steps", async () => {
      getModuleForVolunteer.mockResolvedValue(completion());
      getCertificate.mockResolvedValue({
        certificateNumber: "KC-2026-000007",
        issuedAt: new Date("2026-10-15T09:30:00Z"),
      });
      await renderLesson("part-of-the-family");
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "You're part of the family now. Welcome to KC!",
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("KC-2026-000007")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Download PDF" }),
      ).toHaveAttribute("href", "/api/certificates/KC-2026-000007/pdf");
      expect(screen.queryByText(/WhatsApp/)).toBeNull();
      expect(
        screen.getByText(/KC onboarding team will contact you directly/),
      ).toBeInTheDocument();
      expect(screen.getByText("Photography")).toBeInTheDocument();
      expect(screen.getByText("Maame Ama Acquah")).toBeInTheDocument();
      expect(screen.getByText("Sundays at 1:30pm")).toBeInTheDocument();
      expect(screen.queryByText("Lesson body")).toBeNull();
    });
  });

  it("keeps narrator content for volunteers who hid the guide", async () => {
    requireVolunteer.mockResolvedValueOnce({
      id: "v1",
      firstName: "Ada",
      hideNarrator: true,
    });
    await renderLesson("what-we-believe");
    expect(
      screen.getByText("Let's dig into what we believe."),
    ).toBeInTheDocument();
  });

  it("links Previous always and Next only once it's unlocked", async () => {
    const { unmount } = await renderLesson("what-we-believe");
    let nav = screen.getByRole("navigation", { name: "Module navigation" });
    expect(
      within(nav).getByRole("link", { name: /Previous.*Welcome/ }),
    ).toHaveAttribute("href", "/course/kc/welcome");
    expect(within(nav).queryByRole("link", { name: /Next/ })).toBeNull();
    unmount();

    getModuleForVolunteer.mockResolvedValue(
      okLesson("what-we-believe", {
        next: {
          slug: "final-quiz",
          title: "Final Quiz",
          status: "in-progress",
        },
      }),
    );
    await renderLesson("what-we-believe");
    nav = screen.getByRole("navigation", { name: "Module navigation" });
    expect(
      within(nav).getByRole("link", { name: /Next.*Final Quiz/ }),
    ).toHaveAttribute("href", "/course/kc/final-quiz");
  });

  it("shows available and locked statuses in the sidebar", async () => {
    getModuleForVolunteer.mockResolvedValue(
      okLesson("what-we-believe", {
        outline: [
          {
            slug: "welcome",
            title: "Welcome",
            status: "completed",
            started: true,
          },
          {
            slug: "what-we-believe",
            title: "What We Believe",
            status: "in-progress",
            started: false,
          },
          {
            slug: "final-quiz",
            title: "Final Quiz",
            status: "locked",
            started: false,
          },
        ],
      }),
    );
    await renderLesson("what-we-believe");
    const sidebar = screen.getByRole("complementary", {
      name: "Course modules",
    });
    expect(
      within(sidebar).getByRole("link", { name: /Welcome.*Completed/ }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("link", {
        name: /What We Believe.*Not started/,
      }),
    ).toBeInTheDocument();
    expect(
      within(sidebar)
        .getByText(/Final Quiz/)
        .closest("a"),
    ).toBeNull();
  });
});
