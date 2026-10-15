import { format } from "prettier";
import { questionBankJsonSchema } from "./question-bank";

/** Referenced by each bank's "$schema", so VS Code validates while editing. */
export const QUESTION_BANK_SCHEMA_PATH =
  "content/quizzes/question-bank.schema.json";

/** The schema file's contents, formatted the way Prettier would. */
export function renderQuestionBankJsonSchema() {
  return format(JSON.stringify(questionBankJsonSchema()), { parser: "json" });
}
