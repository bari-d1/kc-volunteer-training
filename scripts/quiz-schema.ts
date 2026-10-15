/**
 * Regenerates content/quizzes/question-bank.schema.json from the Zod schema.
 *
 * Usage: pnpm quiz:schema
 */
import { writeFileSync } from "node:fs";
import {
  QUESTION_BANK_SCHEMA_PATH,
  renderQuestionBankJsonSchema,
} from "@/lib/schemas/question-bank-json-schema";

renderQuestionBankJsonSchema().then((json) => {
  writeFileSync(QUESTION_BANK_SCHEMA_PATH, json);
  console.log(`Wrote ${QUESTION_BANK_SCHEMA_PATH}`);
});
