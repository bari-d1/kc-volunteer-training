import Link from "next/link";
import { cn } from "@/lib/cn";
import type { QuestionBankRow } from "@/server/admin/quiz";
import { Badge, CorrectRate } from "./question-bank-table";

function QuestionLine({ question }: { question: QuestionBankRow }) {
  return (
    <li
      className={cn(
        "flex flex-col gap-1 border-t border-surface-2 py-2 sm:flex-row sm:items-start sm:gap-3",
        !question.active && "opacity-60",
      )}
    >
      <Link
        href={`/admin/quiz/${question.id}`}
        className="w-12 shrink-0 font-bold underline-offset-4 hover:text-lime hover:underline"
      >
        {question.id}
      </Link>
      <span className="flex-1 text-small">{question.prompt}</span>
      <span className="flex shrink-0 flex-wrap items-center gap-1 text-small">
        {!question.active && <Badge>Inactive</Badge>}
        {question.required && <Badge>Required</Badge>}
        <span className="w-24 text-right text-muted tabular-nums">
          {question.shown > 0 ? (
            <>
              <CorrectRate row={question} /> of {question.shown}
            </>
          ) : (
            "Not shown yet"
          )}
        </span>
      </span>
    </li>
  );
}

/**
 * Questions by topic, then by group: each group tests one fact and an
 * attempt draws one of its questions, so admins can see which facts are
 * covered and how many variations each has.
 */
export function QuestionGroups({
  questions,
  sections,
}: {
  questions: QuestionBankRow[];
  sections: Array<{ topic: string; title: string }>;
}) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => {
        const inTopic = questions.filter((q) => q.topic === section.topic);
        const groups = [...new Set(inTopic.flatMap((q) => q.group ?? []))];
        const single = inTopic.filter((q) => !q.group);
        const facts =
          groups.filter((g) => inTopic.some((q) => q.group === g && q.active))
            .length + single.filter((q) => q.active).length;
        return (
          <section
            key={section.topic}
            aria-labelledby={`topic-${section.topic}`}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`topic-${section.topic}`} className="text-h3">
                {section.title}
              </h2>
              <span className="text-small text-muted">
                {facts} fact{facts === 1 ? "" : "s"} covered · {inTopic.length}{" "}
                question{inTopic.length === 1 ? "" : "s"}
              </span>
            </div>
            {groups.map((group) => {
              const members = inTopic.filter((q) => q.group === group);
              const active = members.filter((q) => q.active).length;
              return (
                <div
                  key={group}
                  className="rounded-md border border-surface-2 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <h3 className="font-bold">
                      {group}{" "}
                      <span className="text-small font-normal text-muted">
                        {active} active variation{active === 1 ? "" : "s"}
                      </span>
                    </h3>
                    <Link
                      href={`/admin/quiz/new?topic=${section.topic}&group=${group}`}
                      className="text-small font-bold text-muted underline-offset-4 hover:text-text hover:underline"
                    >
                      + Add a variation
                      <span className="sr-only"> to {group}</span>
                    </Link>
                  </div>
                  <ul>
                    {members.map((q) => (
                      <QuestionLine key={q.id} question={q} />
                    ))}
                  </ul>
                </div>
              );
            })}
            {single.length > 0 && (
              <div className="rounded-md border border-dashed border-surface-2 p-3">
                <h3 className="pb-2 font-bold">
                  Not in a group{" "}
                  <span className="text-small font-normal text-muted">
                    each is its own fact
                  </span>
                </h3>
                <ul>
                  {single.map((q) => (
                    <QuestionLine key={q.id} question={q} />
                  ))}
                </ul>
              </div>
            )}
            {inTopic.length === 0 && (
              <p className="text-small text-muted">No questions yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
