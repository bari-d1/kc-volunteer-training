"use server";

import { redirect } from "next/navigation";
import {
  adminLockout,
  clientIp,
  endAdminSession,
  hashIp,
  isAdminConfigured,
  recordAdminLoginAttempt,
  requireAdmin,
  startAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { safeNextPath } from "@/lib/safe-next-path";

export type AdminLoginState = { error?: string };

/** Only allow redirects back into the admin area. */
function adminNext(value: FormDataEntryValue | null) {
  const next = safeNextPath(typeof value === "string" ? value : null, "/admin");
  return next === "/admin" || next.startsWith("/admin/") ? next : "/admin";
}

export async function adminLogin(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  if (!isAdminConfigured()) {
    return {
      error: "Admin sign-in isn't set up yet. Ask whoever deploys the site.",
    };
  }

  const ipHash = hashIp(await clientIp());
  try {
    const lockout = await adminLockout(ipHash);
    if (lockout.locked) {
      return {
        error: `Too many incorrect attempts. Take a breather and try again in ${lockout.retryAfterMinutes} minute${lockout.retryAfterMinutes === 1 ? "" : "s"}.`,
      };
    }
  } catch (error) {
    console.error("Admin lockout check failed", error);
    return {
      error: "We couldn't sign you in right now. Please try again in a moment.",
    };
  }

  const password = formData.get("password");
  const ok = await verifyAdminPassword(
    typeof password === "string" ? password : "",
  );
  await recordAdminLoginAttempt(ipHash, ok);
  if (!ok)
    return { error: "That password isn't right. Check it and try again." };

  await startAdminSession();
  redirect(adminNext(formData.get("next")));
}

export async function adminLogout() {
  await requireAdmin();
  await endAdminSession();
  redirect("/admin/login");
}
