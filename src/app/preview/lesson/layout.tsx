import type { Metadata } from "next";
import { CourseLayout } from "@/components/blocks/course-layout";
import { mockCourseNav } from "@/lib/mock-course";

export const metadata: Metadata = {
  title: "Lesson preview",
  robots: { index: false },
};

// Shared layout so the shell persists and only lesson content transitions.
export default function LessonPreviewLayout({
  children,
}: LayoutProps<"/preview/lesson">) {
  return <CourseLayout course={mockCourseNav()}>{children}</CourseLayout>;
}
