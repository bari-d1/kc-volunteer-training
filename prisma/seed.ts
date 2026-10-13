/**
 * pnpm db:seed — sample data, safe to run repeatedly.
 *
 * Every record is matched by its slug, key or name and only created when
 * missing, so rerunning never duplicates rows or overwrites admin edits.
 * Blocks are only added to modules that have none yet.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import {
  branches,
  course,
  leaders,
  modules,
  quizQuestions,
  siteSettings,
  validateSeedData,
} from "./seed-data";

// Fail loudly before touching the database.
validateSeedData();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("Set DIRECT_URL (or DATABASE_URL) to seed.");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const tally = new Map<string, { created: number; existing: number }>();
function count(entity: string, created: boolean) {
  const row = tally.get(entity) ?? { created: 0, existing: 0 };
  row[created ? "created" : "existing"]++;
  tally.set(entity, row);
}

/** Runs create() only when find() returns nothing. */
async function ensure<T>(
  entity: string,
  find: () => Promise<T | null>,
  create: () => Promise<T>,
) {
  const existing = await find();
  count(entity, !existing);
  return existing ?? (await create());
}

async function seed(tx: Prisma.TransactionClient) {
  const kc = await ensure(
    "Course",
    () => tx.course.findUnique({ where: { slug: course.slug } }),
    () => tx.course.create({ data: course }),
  );

  for (const [order, { blocks, ...module }] of modules.entries()) {
    const row = await ensure(
      "Module",
      () =>
        tx.module.findUnique({
          where: { courseId_slug: { courseId: kc.id, slug: module.slug } },
        }),
      () =>
        tx.module.create({
          data: { ...module, courseId: kc.id, order, isPublished: true },
        }),
    );
    if ((await tx.block.count({ where: { moduleId: row.id } })) === 0) {
      await tx.block.createMany({
        data: blocks.map((block, index) => ({
          moduleId: row.id,
          order: index,
          type: block.type,
          content: block.content as Prisma.InputJsonValue,
        })),
      });
      blocks.forEach(() => count("Block", true));
    } else {
      blocks.forEach(() => count("Block", false));
    }
  }

  for (const [order, { teams, ...branch }] of branches.entries()) {
    const row = await ensure(
      "Branch",
      () => tx.branch.findUnique({ where: { code: branch.code } }),
      () => tx.branch.create({ data: { ...branch, order } }),
    );
    for (const [teamOrder, name] of teams.entries()) {
      await ensure(
        "Team",
        () => tx.team.findFirst({ where: { branchId: row.id, name } }),
        () =>
          tx.team.create({
            data: { branchId: row.id, name, order: teamOrder },
          }),
      );
    }
  }

  const branchIds = new Map(
    (await tx.branch.findMany({ select: { id: true, code: true } })).map(
      (b) => [b.code, b.id],
    ),
  );
  for (const [order, { branch, ...leader }] of leaders.entries()) {
    await ensure(
      "Leader",
      () =>
        tx.leader.findFirst({
          where: { name: leader.name, group: leader.group },
        }),
      () =>
        tx.leader.create({
          data: {
            ...leader,
            order,
            branchId: branch ? branchIds.get(branch) : null,
          },
        }),
    );
  }

  for (const [key, value] of Object.entries(siteSettings)) {
    await ensure(
      "SiteSetting",
      () => tx.siteSetting.findUnique({ where: { key } }),
      () =>
        tx.siteSetting.create({
          data: { key, value: value as Prisma.InputJsonValue },
        }),
    );
  }

  for (const question of quizQuestions) {
    await ensure(
      "QuizQuestion",
      () =>
        tx.quizQuestion.findFirst({
          where: { courseId: kc.id, prompt: question.prompt },
        }),
      () => tx.quizQuestion.create({ data: { ...question, courseId: kc.id } }),
    );
  }
}

async function main() {
  try {
    await prisma.$transaction(seed, { timeout: 60_000 });
    console.log("Seed complete:");
    for (const [entity, { created, existing }] of tally) {
      console.log(
        `  ${entity.padEnd(13)} ${created} created, ${existing} already there`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
