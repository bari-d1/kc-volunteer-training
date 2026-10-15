"use server";

import { redirect } from "next/navigation";
import { unsubscribeWithToken } from "@/server/email-preferences";

/** The confirm button on /email/unsubscribe. No sign-in needed: the token is the proof. */
export async function confirmUnsubscribe(formData: FormData) {
  const ok = await unsubscribeWithToken(String(formData.get("token") ?? ""));
  redirect(ok ? "/email/unsubscribe?done=1" : "/email/unsubscribe?error=1");
}
