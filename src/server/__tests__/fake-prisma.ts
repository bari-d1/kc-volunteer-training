/** Minimal in-memory stand-in for the Prisma calls src/server makes. */
type Course = { id: string; isPublished: boolean; slug?: string };
type Module = {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  summary: string;
  order: number;
  isPublished: boolean;
  requiresCheck: boolean;
  narratorIntro: string | null;
};
type Block = {
  id: string;
  moduleId: string;
  order: number;
  type: string;
  content: unknown;
  isPublished: boolean;
};
type Progress = {
  profileId: string;
  moduleId: string;
  lastBlockOrder: number;
  checkPassed: boolean;
  completedAt: Date | null;
};

export function createFakePrisma() {
  const db = {
    courses: [] as Course[],
    modules: [] as Module[],
    blocks: [] as Block[],
    progress: [] as Progress[],
  };

  const coursePublished = (courseId: string) =>
    db.courses.find((c) => c.id === courseId)?.isPublished ?? false;

  type ModuleWhere = {
    id?: string;
    courseId?: string;
    slug?: string;
    isPublished?: boolean;
    course?: { isPublished: boolean };
  };
  const moduleMatches = (m: Module, w: ModuleWhere = {}) =>
    (w.id === undefined || m.id === w.id) &&
    (w.courseId === undefined || m.courseId === w.courseId) &&
    (w.slug === undefined || m.slug === w.slug) &&
    (w.isPublished === undefined || m.isPublished === w.isPublished) &&
    (w.course === undefined ||
      coursePublished(m.courseId) === w.course.isPublished);

  type ProgressWhere = {
    profileId?: string;
    moduleId?: string;
    completedAt?: { not: null };
    module?: { courseId: string };
    lastBlockOrder?: { lt: number };
  };
  const progressMatches = (p: Progress, w: ProgressWhere = {}) =>
    (w.profileId === undefined || p.profileId === w.profileId) &&
    (w.moduleId === undefined || p.moduleId === w.moduleId) &&
    (w.completedAt === undefined || p.completedAt !== null) &&
    (w.module === undefined ||
      db.modules.find((m) => m.id === p.moduleId)?.courseId ===
        w.module.courseId) &&
    (w.lastBlockOrder === undefined || p.lastBlockOrder < w.lastBlockOrder.lt);

  const findProgress = (key: { profileId: string; moduleId: string }) =>
    db.progress.find(
      (p) => p.profileId === key.profileId && p.moduleId === key.moduleId,
    );

  const prisma = {
    module: {
      findMany: async ({ where }: { where?: ModuleWhere }) =>
        db.modules
          .filter((m) => moduleMatches(m, where))
          .sort((a, b) => a.order - b.order),
      findFirst: async ({ where }: { where?: ModuleWhere }) =>
        db.modules.find((m) => moduleMatches(m, where)) ?? null,
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const m = db.modules.find((x) => x.id === where.id);
        if (!m) throw new Error("not found");
        return {
          ...m,
          blocks: db.blocks
            .filter((b) => b.moduleId === m.id && b.isPublished)
            .sort((a, b) => a.order - b.order),
        };
      },
    },
    moduleProgress: {
      findMany: async ({ where }: { where?: ProgressWhere }) =>
        db.progress.filter((p) => progressMatches(p, where)),
      findUnique: async ({
        where,
      }: {
        where: { profileId_moduleId: { profileId: string; moduleId: string } };
      }) => findProgress(where.profileId_moduleId) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { profileId_moduleId: { profileId: string; moduleId: string } };
        create: Partial<Progress> & { profileId: string; moduleId: string };
        update: Partial<Progress>;
      }) => {
        const existing = findProgress(where.profileId_moduleId);
        if (existing) return Object.assign(existing, update);
        const row = {
          lastBlockOrder: 0,
          checkPassed: false,
          completedAt: null,
          ...create,
        };
        db.progress.push(row);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: ProgressWhere;
        data: Partial<Progress>;
      }) => {
        const rows = db.progress.filter((p) => progressMatches(p, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
    block: {
      findMany: async ({
        where,
      }: {
        where: { moduleId: string; isPublished?: boolean; type?: string };
      }) =>
        db.blocks
          .filter(
            (b) =>
              b.moduleId === where.moduleId &&
              (where.isPublished === undefined ||
                b.isPublished === where.isPublished) &&
              (where.type === undefined || b.type === where.type),
          )
          .sort((a, b) => a.order - b.order),
    },
  };

  return { db, prisma };
}

let counter = 0;
export const uuid = () =>
  `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

export function module(
  courseId: string,
  slug: string,
  order: number,
  overrides: Partial<Module> = {},
): Module {
  return {
    id: uuid(),
    courseId,
    slug,
    title: slug.replace(/-/g, " "),
    summary: "",
    order,
    isPublished: true,
    requiresCheck: false,
    narratorIntro: null,
    ...overrides,
  };
}
