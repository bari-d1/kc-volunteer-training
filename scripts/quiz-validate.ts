/**
 * Checks a quiz question bank and prints a summary.
 *
 * Usage: pnpm quiz:validate content/quizzes/volunteers-onboarding.json
 */
import { readFileSync } from "node:fs";
import {
  formatQuestionBankIssues,
  QuestionBankSchema,
  summarizeQuestionBank,
} from "@/lib/schemas/question-bank";

const file = process.argv[2];
if (!file) {
  console.error("Usage: pnpm quiz:validate <file>");
  process.exit(1);
}

let input: unknown;
try {
  input = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.error(`✗ Can't read ${file}: ${(error as Error).message}`);
  process.exit(1);
}

const result = QuestionBankSchema.safeParse(input);
if (!result.success) {
  const lines = formatQuestionBankIssues(result.error.issues, input);
  console.error(`✗ ${file}: ${lines.length} problem(s)`);
  for (const line of lines) console.error(`  - ${line}`);
  process.exit(1);
}

const summary = summarizeQuestionBank(result.data);
console.log(
  `✓ ${file} is valid (${result.data.courseSlug} v${result.data.version})`,
);
console.log(`  Questions   ${summary.questions} (${summary.active} active)`);
console.log(`  Groups      ${summary.groups}`);
console.log(
  `  Draw units  ${summary.drawUnits} for ${result.data.settings.questionsPerAttempt} per attempt`,
);
console.log(`  Required    ${summary.required}`);
console.log("  By topic:");
const width = Math.max(...summary.byTopic.map((t) => t.topic.length));
for (const t of summary.byTopic) {
  const inactive = t.questions - t.active;
  console.log(
    `    ${t.topic.padEnd(width)}  ${String(t.active).padStart(3)}${inactive ? ` (+${inactive} inactive)` : ""}  ${t.title}`,
  );
}
