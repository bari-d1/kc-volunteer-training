/**
 * Syncs a quiz question bank into the database.
 *
 * Usage: pnpm quiz:import <file> [--dry-run]
 *   --dry-run  list what would be added, updated and deactivated; write nothing
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import {
  describeImport,
  importQuestionBank,
  loadQuestionBank,
} from "../prisma/quiz-import";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("Usage: pnpm quiz:import <file> [--dry-run]");
  process.exit(1);
}

async function main(file: string) {
  // Validate before connecting: an invalid file never touches the database.
  const bank = loadQuestionBank(file);

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DIRECT_URL (or DATABASE_URL).");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const report = dryRun
      ? await importQuestionBank(prisma, bank, { dryRun })
      : await prisma.$transaction((tx) => importQuestionBank(tx, bank), {
          timeout: 60_000,
        });
    console.log(
      `${dryRun ? "Dry run, nothing written" : "Imported"}: ${file} → ${bank.courseSlug} (v${bank.version})`,
    );
    for (const line of describeImport(report, { dryRun, verbose: dryRun })) {
      console.log(`  ${line}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main(file).catch((error) => {
  console.error(`✗ ${(error as Error).message}`);
  process.exit(1);
});
