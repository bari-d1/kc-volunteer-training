import "server-only";
import { z } from "zod";
import { NonEmptyString } from "@/lib/schemas/common";

export const SlugSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and dashes",
  );

export const IdListSchema = z.array(z.uuid()).min(1);

export const CourseInputSchema = z.object({
  slug: SlugSchema,
  title: NonEmptyString,
  description: z.string().trim(),
  isPublished: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export const ModuleInputSchema = z.object({
  slug: SlugSchema,
  title: NonEmptyString,
  summary: z.string().trim(),
  isPublished: z.boolean().default(false),
  narratorIntro: NonEmptyString.nullable().default(null),
  requiresCheck: z.boolean().default(false),
});
