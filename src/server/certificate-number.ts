import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/** KC-2026-000123: the year, then a counter that restarts each year. */
export const CERTIFICATE_NUMBER_PATTERN = /^KC-\d{4}-\d{6}$/;

export const isCertificateNumber = (value: string) =>
  CERTIFICATE_NUMBER_PATTERN.test(value);

const counterKey = (year: number) => `certificate-counter:${year}`;

/**
 * The next certificate number for the year. Increments a counter row in
 * SiteSetting with a single upsert, which locks the row until the
 * transaction ends: concurrent passes queue up instead of sharing a number,
 * and a rolled-back transaction gives its number back.
 */
export async function nextCertificateNumber(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  now = new Date(),
) {
  const year = now.getUTCFullYear();
  const [{ last }] = await tx.$queryRaw<Array<{ last: number }>>`
    INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
    VALUES (${counterKey(year)}, '{"last": 1}'::jsonb, now())
    ON CONFLICT ("key") DO UPDATE
      SET "value" = jsonb_build_object(
            'last', ("SiteSetting"."value"->>'last')::int + 1
          ),
          "updatedAt" = now()
    RETURNING ("value"->>'last')::int AS "last"`;
  return `KC-${year}-${String(last).padStart(6, "0")}`;
}
