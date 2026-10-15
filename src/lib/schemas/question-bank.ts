import { z } from "zod";
import { NonEmptyString } from "./common";

/**
 * The quiz question bank, edited as JSON in content/quizzes/<course>.json.
 * Run `pnpm quiz:validate <file>` after editing; `pnpm quiz:schema` after
 * changing this file (VS Code validates the JSON against the output).
 */

const Slug = NonEmptyString.regex(
  /^[a-z0-9]+(-[a-z0-9]+)*$/,
  "Use lowercase words joined by hyphens, e.g. about-kc",
);

export const QuestionBankOptionSchema = z.strictObject({
  id: NonEmptyString,
  text: NonEmptyString,
});

export const QuestionBankQuestionSchema = z.strictObject({
  /** Stable id, e.g. "Q01". Kept when a question is reworded. */
  id: NonEmptyString.regex(/^Q\d{2,}$/, 'Expected an id like "Q01"'),
  /** Must match one of the bank's sections[].topic. */
  topic: Slug,
  /** Questions in the same group test the same fact; an attempt draws one. */
  group: Slug.optional(),
  prompt: NonEmptyString,
  options: z.array(QuestionBankOptionSchema).min(2).max(6),
  correctOptionId: NonEmptyString,
  /** Shown after answering; may be empty. */
  explanation: z.string().trim(),
  /** Always included in every attempt. */
  required: z.boolean(),
  active: z.boolean(),
});

export const QuestionBankSectionSchema = z.strictObject({
  topic: Slug,
  title: NonEmptyString,
});

export const QuestionBankSettingsSchema = z.strictObject({
  /** Percentage needed to pass, 0–100. */
  passMark: z.number().int().min(0).max(100),
  questionsPerAttempt: z.number().int().min(1),
});

const QuestionBankShape = z.strictObject({
  $schema: z.string().optional(),
  courseSlug: Slug,
  version: z.number().int().min(1),
  settings: QuestionBankSettingsSchema,
  sections: z.array(QuestionBankSectionSchema).min(1),
  questions: z.array(QuestionBankQuestionSchema).min(1),
});

export type QuestionBankOption = z.infer<typeof QuestionBankOptionSchema>;
export type QuestionBankQuestion = z.infer<typeof QuestionBankQuestionSchema>;
export type QuestionBankSection = z.infer<typeof QuestionBankSectionSchema>;
export type QuestionBankSettings = z.infer<typeof QuestionBankSettingsSchema>;
export type QuestionBank = z.infer<typeof QuestionBankShape>;

/**
 * How many distinct picks an attempt can make from the active questions:
 * each group counts once, each ungrouped question counts once.
 */
export function countDrawUnits(questions: QuestionBankQuestion[]) {
  const active = questions.filter((q) => q.active);
  const groups = new Set(active.flatMap((q) => (q.group ? [q.group] : [])));
  return groups.size + active.filter((q) => !q.group).length;
}

function checkBank(bank: QuestionBank, ctx: z.RefinementCtx) {
  const issue = (path: PropertyKey[], message: string) =>
    ctx.addIssue({ code: "custom", path, message });

  const sectionTopics = new Set<string>();
  bank.sections.forEach((section, index) => {
    if (sectionTopics.has(section.topic)) {
      issue(
        ["sections", index, "topic"],
        `Duplicate section "${section.topic}"`,
      );
    }
    sectionTopics.add(section.topic);
  });

  const questionIds = new Set<string>();
  const requiredByGroup = new Map<string, string>();
  bank.questions.forEach((question, index) => {
    const at = (...path: PropertyKey[]) => ["questions", index, ...path];

    if (questionIds.has(question.id)) {
      issue(at("id"), `Duplicate question id "${question.id}"`);
    }
    questionIds.add(question.id);

    const optionIds = question.options.map((o) => o.id);
    optionIds.forEach((id, optionIndex) => {
      if (optionIds.indexOf(id) !== optionIndex) {
        issue(at("options", optionIndex, "id"), `Duplicate option id "${id}"`);
      }
    });
    if (!optionIds.includes(question.correctOptionId)) {
      issue(
        at("correctOptionId"),
        `"${question.correctOptionId}" isn't one of the options (${optionIds.join(", ")})`,
      );
    }

    if (!sectionTopics.has(question.topic)) {
      issue(
        at("topic"),
        `Unknown topic "${question.topic}"; add it to sections or use one of: ${[...sectionTopics].join(", ")}`,
      );
    }

    if (question.required && question.group) {
      const other = requiredByGroup.get(question.group);
      if (other) {
        issue(
          at("required"),
          `Group "${question.group}" already has a required question (${other})`,
        );
      } else {
        requiredByGroup.set(question.group, question.id);
      }
    }
  });

  const { questionsPerAttempt } = bank.settings;
  const required = bank.questions.filter((q) => q.active && q.required).length;
  if (required > questionsPerAttempt) {
    issue(
      ["settings", "questionsPerAttempt"],
      `${required} active questions are required, but an attempt only has ${questionsPerAttempt}`,
    );
  }
  const drawUnits = countDrawUnits(bank.questions);
  if (drawUnits < questionsPerAttempt) {
    issue(
      ["settings", "questionsPerAttempt"],
      `Only ${drawUnits} draw units (each group counts once) for ${questionsPerAttempt} questions per attempt; add questions or groups, or lower questionsPerAttempt`,
    );
  }
}

export const QuestionBankSchema = QuestionBankShape.superRefine(checkBank);

/**
 * One line per problem, naming the question by id where there is one:
 * `Q12 correctOptionId: "e" isn't one of the options (a, b, c, d)`.
 */
export function formatQuestionBankIssues(
  issues: z.core.$ZodIssue[],
  input: unknown,
): string[] {
  const questions =
    input && typeof input === "object" && "questions" in input
      ? (input as { questions: unknown }).questions
      : undefined;
  return issues.map((issue) => {
    const [first, second, ...rest] = issue.path;
    if (first === "questions" && typeof second === "number") {
      const raw = Array.isArray(questions) ? questions[second] : undefined;
      const id =
        raw && typeof raw === "object" && typeof raw.id === "string"
          ? raw.id
          : `questions[${second}]`;
      const field = rest.join(".") || "(question)";
      return `${id} ${field}: ${issue.message}`;
    }
    return `${issue.path.join(".") || "(root)"}: ${issue.message}`;
  });
}

export type QuestionBankSummary = {
  questions: number;
  active: number;
  groups: number;
  drawUnits: number;
  required: number;
  byTopic: Array<{
    topic: string;
    title: string;
    questions: number;
    active: number;
  }>;
};

export function summarizeQuestionBank(bank: QuestionBank): QuestionBankSummary {
  const active = bank.questions.filter((q) => q.active);
  return {
    questions: bank.questions.length,
    active: active.length,
    groups: new Set(active.flatMap((q) => (q.group ? [q.group] : []))).size,
    drawUnits: countDrawUnits(bank.questions),
    required: active.filter((q) => q.required).length,
    byTopic: bank.sections.map(({ topic, title }) => ({
      topic,
      title,
      questions: bank.questions.filter((q) => q.topic === topic).length,
      active: active.filter((q) => q.topic === topic).length,
    })),
  };
}

/** JSON Schema for editors. Generated into question-bank.schema.json. */
export function questionBankJsonSchema() {
  return {
    ...z.toJSONSchema(QuestionBankShape, { target: "draft-7" }),
    title: "KC quiz question bank",
    description:
      "Generated from src/lib/schemas/question-bank.ts by `pnpm quiz:schema`. Cross-field rules (unique ids, topics, groups, draw units) are checked by `pnpm quiz:validate`.",
  };
}
