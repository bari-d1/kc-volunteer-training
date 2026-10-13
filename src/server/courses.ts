import "server-only";

export type { VolunteerBlock };
import type { VolunteerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BlockValidationError,
  parseBlock,
  type VolunteerBlock,
} from "@/lib/schemas/blocks";
import { toPublicBlock } from "./public-block";
import { computeModuleStates, type ModuleStatus } from "./unlock";

export async function getPublishedCourse(slug: string) {
  return prisma.course.findFirst({
    where: { slug, isPublished: true },
    select: { id: true, slug: true, title: true, description: true },
  });
}

const moduleSummary = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  order: true,
  requiresCheck: true,
} as const;

/** Published modules in course order, each with its status and progress. */
export async function getModulesWithProgress(
  courseId: string,
  profileId: VolunteerId,
) {
  const [modules, progress] = await Promise.all([
    prisma.module.findMany({
      where: { courseId, isPublished: true, course: { isPublished: true } },
      orderBy: { order: "asc" },
      select: moduleSummary,
    }),
    prisma.moduleProgress.findMany({
      where: { profileId, module: { courseId } },
      select: {
        moduleId: true,
        lastBlockOrder: true,
        checkPassed: true,
        completedAt: true,
      },
    }),
  ]);

  const byModule = new Map(progress.map((p) => [p.moduleId, p]));
  const completed = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.moduleId),
  );

  return computeModuleStates(modules, completed).map((m) => ({
    ...m,
    progress: byModule.get(m.id) ?? null,
  }));
}

export type VolunteerModuleSummary = Awaited<
  ReturnType<typeof getModulesWithProgress>
>[number];

/** Every published module in order, for the lesson sidebar. */
export type ModuleOutline = Array<{
  slug: string;
  title: string;
  status: ModuleStatus;
}>;

export type ModuleForVolunteer =
  | { status: "not-found" }
  | {
      status: "locked";
      module: { id: string; slug: string; title: string };
      unlockedBy: { slug: string; title: string } | null;
      outline: ModuleOutline;
    }
  | {
      status: Exclude<ModuleStatus, "locked">;
      module: {
        id: string;
        slug: string;
        title: string;
        summary: string;
        order: number;
        narratorIntro: string | null;
        requiresCheck: boolean;
      };
      blocks: VolunteerBlock[];
      progress: {
        lastBlockOrder: number;
        checkPassed: boolean;
        completedAt: Date | null;
      } | null;
      previous: { slug: string; title: string } | null;
      next: { slug: string; title: string; status: ModuleStatus } | null;
      /** 1-based position among published modules. */
      number: number;
      outline: ModuleOutline;
    };

/**
 * One module for a volunteer, if it's published and unlocked. Blocks are
 * parsed with parseBlock; an invalid block is logged and skipped so one bad
 * edit doesn't take the whole lesson down.
 */
export async function getModuleForVolunteer(
  courseId: string,
  moduleSlug: string,
  profileId: VolunteerId,
): Promise<ModuleForVolunteer> {
  const modules = await getModulesWithProgress(courseId, profileId);
  const index = modules.findIndex((m) => m.slug === moduleSlug);
  if (index === -1) return { status: "not-found" };
  const summary = modules[index];
  const outline: ModuleOutline = modules.map(({ slug, title, status }) => ({
    slug,
    title,
    status,
  }));

  if (summary.status === "locked") {
    return {
      status: "locked",
      module: { id: summary.id, slug: summary.slug, title: summary.title },
      unlockedBy: summary.unlockedBy
        ? { slug: summary.unlockedBy.slug, title: summary.unlockedBy.title }
        : null,
      outline,
    };
  }

  const courseModule = await prisma.module.findUniqueOrThrow({
    where: { id: summary.id },
    select: {
      ...moduleSummary,
      narratorIntro: true,
      blocks: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          content: true,
          order: true,
          isPublished: true,
        },
      },
    },
  });

  const blocks: VolunteerBlock[] = [];
  for (const row of courseModule.blocks) {
    try {
      blocks.push(toPublicBlock(parseBlock(row)));
    } catch (error) {
      if (!(error instanceof BlockValidationError)) throw error;
      console.error(error.message);
    }
  }

  const previous = modules[index - 1];
  const next = modules[index + 1];
  return {
    status: summary.status,
    module: {
      id: courseModule.id,
      slug: courseModule.slug,
      title: courseModule.title,
      summary: courseModule.summary,
      order: courseModule.order,
      narratorIntro: courseModule.narratorIntro,
      requiresCheck: courseModule.requiresCheck,
    },
    blocks,
    progress: summary.progress
      ? {
          lastBlockOrder: summary.progress.lastBlockOrder,
          checkPassed: summary.progress.checkPassed,
          completedAt: summary.progress.completedAt,
        }
      : null,
    previous: previous ? { slug: previous.slug, title: previous.title } : null,
    next: next
      ? { slug: next.slug, title: next.title, status: next.status }
      : null,
    number: index + 1,
    outline,
  };
}
