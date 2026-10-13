import type { Metadata } from "next";
import { Suspense } from "react";
import { PillTag } from "@/components/ui/pill-tag";
import { safeNextPath } from "@/lib/safe-next-path";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false },
};

export default function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-gutter py-16">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-4">
          <PillTag>KC Admin</PillTag>
          <h1 className="text-h1">Admin sign in</h1>
          <p className="text-body-lg text-muted">
            Enter the shared admin password to manage courses and content.
          </p>
        </div>
        <Suspense fallback={<AdminLoginForm next="/admin" />}>
          {searchParams.then((params) => {
            const raw = Array.isArray(params.next)
              ? params.next[0]
              : params.next;
            const next = safeNextPath(raw, "/admin");
            return (
              <AdminLoginForm
                next={next.startsWith("/admin") ? next : "/admin"}
              />
            );
          })}
        </Suspense>
      </div>
    </main>
  );
}
