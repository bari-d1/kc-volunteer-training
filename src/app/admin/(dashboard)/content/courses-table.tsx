"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/admin/data-table";

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  isPublished: boolean;
  moduleCount: number;
};

const columns: Column<CourseRow>[] = [
  {
    key: "title",
    header: "Course",
    render: (c) => (
      <Link
        href={`/admin/content/${c.slug}`}
        className="font-bold hover:text-lime"
      >
        {c.title}
      </Link>
    ),
    sortValue: (c) => c.title,
  },
  { key: "slug", header: "Slug", render: (c) => `/${c.slug}` },
  {
    key: "published",
    header: "Published",
    render: (c) => (c.isPublished ? "Yes" : "No"),
    sortValue: (c) => Number(c.isPublished),
  },
  {
    key: "modules",
    header: "Modules",
    align: "right",
    render: (c) => c.moduleCount,
    sortValue: (c) => c.moduleCount,
  },
];

export function CoursesTable({ rows }: { rows: CourseRow[] }) {
  return (
    <DataTable
      caption="Courses"
      rows={rows}
      columns={columns}
      rowKey={(c) => c.id}
      emptyTitle="No courses yet"
    />
  );
}
