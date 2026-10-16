import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { cn } from "@/lib/cn";
import { getQuestionBankOverview } from "@/server/admin/quiz";
import { QuestionBankTable } from "./question-bank-table";
import { QuestionGroups } from "./question-groups";

export const metadata: Metadata = { title: "Quiz" };

type View = "table" | "groups";

export default function AdminQuizPage({
  searchParams,
}: PageProps<"/admin/quiz">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      {searchParams.then(({ view }) => (
        <Quiz view={view === "groups" ? "groups" : "table"} />
      ))}
    </Suspense>
  );
}

async function Quiz({ view }: { view: View }) {
  await requireAdmin();
  const bank = await getQuestionBankOverview();
  const active = bank.questions.filter((q) => q.active).length;
  return (
    <>
      <PageHeader
        title="Quiz"
        description={
          <>
            {active} active question{active === 1 ? "" : "s"}, {bank.drawUnits}{" "}
            different ones to draw from, {bank.settings.questionsPerAttempt} per
            attempt. Changes apply to new attempts; attempts already started
            keep their questions.
          </>
        }
        actions={
          <>
            <Button href="/admin/quiz/new" size="sm">
              Add question
            </Button>
            <Button href="/admin/quiz/import" variant="secondary" size="sm">
              Import JSON
            </Button>
            <Button
              href="/api/admin/quiz/export"
              prefetch={false}
              download
              variant="secondary"
              size="sm"
            >
              Export JSON
            </Button>
          </>
        }
      />
      <nav
        aria-label="Question bank views"
        className="flex gap-1 border-b border-surface-2"
      >
        {(
          [
            ["table", "All questions", "/admin/quiz"],
            ["groups", "By group", "/admin/quiz?view=groups"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={view === key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-small font-bold",
              view === key
                ? "border-lime text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {view === "groups" ? (
        <QuestionGroups questions={bank.questions} sections={bank.sections} />
      ) : (
        <QuestionBankTable
          questions={bank.questions}
          sections={bank.sections}
        />
      )}
    </>
  );
}
