import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
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
  slug: SlugSchema.refine((slug) => slug !== "new", {
    message: "“new” is reserved. Choose another slug.",
  }),
  title: NonEmptyString,
  summary: z.string().trim(),
  isPublished: z.boolean().default(false),
  narratorIntro: NonEmptyString.nullable().default(null),
  requiresCheck: z.boolean().default(false),
});

/** A unique constraint failed, e.g. a slug already in use. */
export function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** A block edit the admin can fix: shown as a toast, with field errors. */
export class BlockEditError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "BlockEditError";
  }
}
