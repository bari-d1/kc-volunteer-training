import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

/** Records an admin write in ContentChange. Call inside the write's transaction. */
export function logChange(
  tx: Tx,
  entity: string,
  entityId: string,
  action: "create" | "update" | "delete" | "reorder" | "publish" | "unpublish",
  summary: string,
) {
  return tx.contentChange.create({
    data: { entity, entityId, action, summary },
  });
}
