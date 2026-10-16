import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin-auth";
import { listBranchesWithTeams, listLeaders } from "@/server/admin/people";
import { BranchesSection } from "./branches-section";
import { LeadersSection } from "./leaders-section";

export const metadata: Metadata = { title: "People & Teams" };

export default function AdminPeoplePage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <People />
    </Suspense>
  );
}

async function People() {
  await requireAdmin();
  const [branches, leaders] = await Promise.all([
    listBranchesWithTeams(),
    listLeaders(),
  ]);
  return (
    <>
      <PageHeader
        title="People & Teams"
        description="Branches, teams and leaders shown in the course and the sign-up form. Changes go live straight away."
      />
      <section aria-labelledby="branches" className="flex flex-col gap-4">
        <h2 id="branches" className="text-h3">
          Branches and teams
        </h2>
        <BranchesSection
          branches={branches.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            description: b.description,
            colour: b.colour,
            teams: b.teams.map((t) => ({
              id: t.id,
              name: t.name,
              isActive: t.isActive,
            })),
          }))}
        />
      </section>
      <section aria-labelledby="leaders" className="flex flex-col gap-4">
        <h2 id="leaders" className="text-h3">
          Leaders
        </h2>
        <p className="text-small text-muted">
          People blocks set to show a group list its shown leaders in this
          order, so a change here updates every lesson that uses them.
        </p>
        <LeadersSection
          branches={branches.map((b) => ({ code: b.code, name: b.name }))}
          leaders={leaders.map((l) => ({
            id: l.id,
            name: l.name,
            role: l.role,
            photoUrl: l.photoUrl,
            group: l.group,
            branchCode: l.branch?.code ?? null,
            branchName: l.branch?.name ?? null,
            isActive: l.isActive,
          }))}
        />
      </section>
    </>
  );
}
