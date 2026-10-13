import "server-only";
import { prisma } from "@/lib/prisma";

/** Runs a trivial read to confirm the database is reachable. Writes nothing. */
export async function checkDatabase() {
  await prisma.course.count();
}
