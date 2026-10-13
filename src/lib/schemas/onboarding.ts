import { z } from "zod";
import type { BranchCode } from "@/generated/prisma/client";

export const BRANCH_CODES = [
  "EXPERIENCE",
  "MINISTRY",
  "CREATIVE",
  "SYSTEMS",
] as const satisfies readonly BranchCode[];

/** Form value for "Not sure yet"; stored as a null branchInterest. */
export const NOT_SURE = "NOT_SURE";

const name = (field: string) =>
  z
    .string({ error: `Enter your ${field}` })
    .trim()
    .min(1, `Enter your ${field}`)
    .max(50, "Keep it under 50 characters");

export const OnboardingSchema = z
  .object({
    firstName: name("first name"),
    lastName: name("last name"),
    branchInterest: z.enum([...BRANCH_CODES, NOT_SURE], {
      error: "Choose a branch, or “Not sure yet”",
    }),
    teamId: z
      .union([z.literal(""), z.uuid({ error: "Choose a team from the list" })])
      .optional(),
    consent: z.literal("on", {
      error: "Please agree so we can track your training",
    }),
  })
  .superRefine((value, ctx) => {
    if (value.teamId && value.branchInterest === NOT_SURE) {
      ctx.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "Choose a branch before picking a team",
      });
    }
  });

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
export type OnboardingField = keyof OnboardingInput;
