import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();

  try {
    await prisma.course.count();
    return Response.json({ ok: true, db: "connected" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ ok: false, db: "unreachable" }, { status: 503 });
  }
}
