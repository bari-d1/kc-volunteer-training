import { connection } from "next/server";
import { checkDatabase } from "@/server/health";

export async function GET() {
  await connection();

  try {
    await checkDatabase();
    return Response.json({ ok: true, db: "connected" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ ok: false, db: "unreachable" }, { status: 503 });
  }
}
