"use client";

import { useRouter } from "next/navigation";
import { useId } from "react";

/** Picks the course the Overview reports on (?course=slug). */
export function CourseFilter({
  courses,
  current,
}: {
  courses: Array<{ slug: string; title: string }>;
  current: string;
}) {
  const id = useId();
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-small font-bold text-muted">
        Course
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) =>
          router.push(`/admin?course=${encodeURIComponent(e.target.value)}`)
        }
        className="h-10 rounded-md border-2 border-surface-2 bg-surface px-3 text-small text-text focus:border-lime"
      >
        {courses.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.title}
          </option>
        ))}
      </select>
    </div>
  );
}
