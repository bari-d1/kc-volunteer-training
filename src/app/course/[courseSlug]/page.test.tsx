import { render, screen } from "@testing-library/react";
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
  usePathname: () => "/course/volunteers-onboarding",
  useParams: () => ({}),
}));

const requireVolunteer = vi.fn(async (_next?: string) => ({
  id: "v1",
  firstName: "Ada",
}));
vi.mock("@/lib/auth", () => ({
  requireVolunteer: (next?: string) => requireVolunteer(next),
}));

const getPublishedCourse = vi.fn();
const getModulesWithProgress = vi.fn();
vi.mock("@/server/courses", () => ({
  getPublishedCourse: (slug: string) => getPublishedCourse(slug),
  getModulesWithProgress: (...a: unknown[]) => getModulesWithProgress(...a),
}));

const { default: CoursePage } = await import("../page");
const pageModule = await import("./page");

// Render the async inner component directly (Suspense isn't needed in tests).
async function renderDashboard(slug: string) {
  const page = pageModule.default({
    params: Promise.resolve({ courseSlug: slug }),
  } as never);
  const dashboard = (
    page.props as {
      children: {
        type: (p: unknown) => Promise<React.ReactNode>;
        props: unknown;
      };
    }
  ).children;
  return render(await dashboard.type(dashboard.props));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  getPublishedCourse.mockResolvedValue({
    id: "c1",
    slug: "volunteers-onboarding",
    title: "Volunteers' Onboarding",
  });
  getModulesWithProgress.mockResolvedValue([
    {
      id: "m1",
      slug: "welcome",
      title: "Welcome",
      summary: "",
      order: 0,
      status: "in-progress",
      progress: null,
      unlockedBy: null,
    },
  ]);
});

describe("/course", () => {
  it("redirects to the default course", () => {
    expect(() => CoursePage()).toThrow(Redirect);
    try {
      CoursePage();
    } catch (error) {
      expect((error as Error).message).toBe("/course/volunteers-onboarding");
    }
  });
});

describe("/course/[courseSlug]", () => {
  it("requires a volunteer and loads their modules for that course", async () => {
    await renderDashboard("volunteers-onboarding");
    expect(requireVolunteer).toHaveBeenCalledWith(
      "/course/volunteers-onboarding",
    );
    expect(getModulesWithProgress).toHaveBeenCalledWith("c1", "v1");
    expect(
      screen.getByRole("heading", { name: "Welcome, Ada" }),
    ).toBeInTheDocument();
    // Dashboard has no module menu or sidebar.
    expect(
      screen.queryByRole("button", { name: "Open modules menu" }),
    ).toBeNull();
    expect(
      screen.queryByRole("complementary", { name: "Course modules" }),
    ).toBeNull();
  });

  it("404s for an unknown or unpublished course", async () => {
    getPublishedCourse.mockResolvedValue(null);
    await expect(renderDashboard("nope")).rejects.toBeInstanceOf(NotFound);
  });

  it("sends signed-out visitors away before loading data", async () => {
    requireVolunteer.mockRejectedValueOnce(new Redirect("/sign-in"));
    await expect(
      renderDashboard("volunteers-onboarding"),
    ).rejects.toBeInstanceOf(Redirect);
    expect(getPublishedCourse).not.toHaveBeenCalled();
  });
});
