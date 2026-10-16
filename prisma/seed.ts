/**
 * pnpm db:seed — course content, safe to run repeatedly.
 *
 * Every record is matched by its slug, key or name and only created when
 * missing, so rerunning never duplicates rows or overwrites admin edits.
 * Blocks are only added to modules that have none yet.
 *
 * pnpm db:seed -- --replace-content makes the database match seed-data.ts:
 * module details, blocks and settings are overwritten (admin edits are
 * lost; blocks are updated in place so their ids, and the reflection
 * answers linked to them, survive), and teams and leaders that aren't in the seed are deactivated
 * rather than deleted, so profiles keep them.
 *
 * Quiz questions, sections and settings always come from the question banks
 * in content/quizzes (see quiz-import.ts), with or without the flag.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  branches,
  course,
  leaders,
  modules,
  siteSettings,
  validateSeedData,
} from "./seed-data";
import {
  describeImport,
  importQuestionBank,
  loadQuestionBank,
  questionBankFiles,
  type ImportReport,
} from "./quiz-import";

const replace = process.argv.includes("--replace-content");

// Fail loudly before touching the database.
validateSeedData();
const banks = questionBankFiles().map(loadQuestionBank);
const imports: ImportReport[] = [];

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

/**
 * Makes a module's blocks match the seed, updating in place where it can:
 * the nth block of each type keeps the id of the nth existing block of that
 * type, so saved reflection answers stay attached to their question.
 */
async function replaceBlocks(
  tx: Prisma.TransactionClient,
  moduleId: string,
  blocks: (typeof modules)[number]["blocks"],
) {
  const existing = await tx.block.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    select: { id: true, type: true },
  });
  const byType = new Map<string, string[]>();
  for (const { id, type } of existing) {
    byType.set(type, [...(byType.get(type) ?? []), id]);
  }
  const kept = new Set<string>();
  for (const [order, block] of blocks.entries()) {
    const data = {
      order,
      type: block.type,
      content: block.content as Prisma.InputJsonValue,
      isPublished: true,
      // The seed is the published version: drop any admin drafts.
      draftContent: Prisma.DbNull,
      draftDeleted: false,
      draftOrder: null,
    };
    const id = byType.get(block.type)?.shift();
    if (id) {
      kept.add(id);
      await tx.block.update({ where: { id }, data });
      count("Block", false);
    } else {
      await tx.block.create({ data: { ...data, moduleId } });
      count("Block", true);
    }
  }
  await tx.block.deleteMany({
    where: { moduleId, id: { notIn: [...kept] } },
  });
}

async function seed(tx: Prisma.TransactionClient) {
  const kc = await ensure(
    "Course",
    () => tx.course.findUnique({ where: { slug: course.slug } }),
    () => tx.course.create({ data: course }),
  );

  for (const [order, { blocks, ...module }] of modules.entries()) {
    let row = await ensure(
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
    if (replace) {
      row = await tx.module.update({ where: { id: row.id }, data: module });
      await replaceBlocks(tx, row.id, blocks);
    } else if ((await tx.block.count({ where: { moduleId: row.id } })) === 0) {
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
    if (replace) {
      await tx.branch.update({
        where: { id: row.id },
        data: { ...branch, order },
      });
      await tx.team.updateMany({
        where: { branchId: row.id, name: { notIn: teams } },
        data: { isActive: false },
      });
    }
    for (const [teamOrder, name] of teams.entries()) {
      const team = await ensure(
        "Team",
        () => tx.team.findFirst({ where: { branchId: row.id, name } }),
        () =>
          tx.team.create({
            data: { branchId: row.id, name, order: teamOrder },
          }),
      );
      if (replace) {
        await tx.team.update({
          where: { id: team.id },
          data: { order: teamOrder, isActive: true },
        });
      }
    }
  }

  const branchIds = new Map(
    (await tx.branch.findMany({ select: { id: true, code: true } })).map(
      (b) => [b.code, b.id],
    ),
  );
  if (replace) {
    await tx.leader.updateMany({
      where: {
        NOT: { OR: leaders.map(({ name, group }) => ({ name, group })) },
      },
      data: { isActive: false },
    });
  }
  for (const [order, { branch, ...leader }] of leaders.entries()) {
    const row = await ensure(
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
    if (replace) {
      await tx.leader.update({
        where: { id: row.id },
        data: {
          ...leader,
          order,
          isActive: true,
          branchId: branch ? branchIds.get(branch) : null,
        },
      });
    }
  }

  for (const [key, value] of Object.entries(siteSettings)) {
    if (replace) {
      await tx.siteSetting.deleteMany({ where: { key } });
    }
    await ensure(
      "SiteSetting",
      () => tx.siteSetting.findUnique({ where: { key } }),
      () =>
        tx.siteSetting.create({
          data: { key, value: value as Prisma.InputJsonValue },
        }),
    );
  }

  for (const bank of banks) {
    imports.push(await importQuestionBank(tx, bank));
  }
}

async function main() {
  try {
    await prisma.$transaction(seed, { timeout: 60_000 });
    console.log(
      replace ? "Seed complete (content replaced):" : "Seed complete:",
    );
    for (const [entity, { created, existing }] of tally) {
      console.log(
        `  ${entity.padEnd(13)} ${created} created, ${existing} already there`,
      );
    }
    for (const report of imports) {
      console.log(`Quiz bank ${report.courseSlug}:`);
      for (const line of describeImport(report)) console.log(`  ${line}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
