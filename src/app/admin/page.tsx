import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLogout } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

// Placeholder until the admin editor is built.
export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-gutter py-16">
      <Suspense>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Admin dashboard</h1>
      <p className="text-body-lg text-muted">
        Course and content tools are coming soon.
      </p>
      <form action={adminLogout}>
        <Button type="submit" variant="secondary" size="sm">
          Log out
        </Button>
      </form>
    </div>
  );
}
