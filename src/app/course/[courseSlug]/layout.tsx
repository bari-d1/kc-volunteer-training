import { NarratorProvider } from "@/components/narrator/narrator-context";

/**
 * Persists across the dashboard and lessons, so the narrator dock and its
 * current message survive navigation. Pages switch it on with NarratorConfig.
 */
export default function CourseSegmentLayout({
  children,
}: LayoutProps<"/course/[courseSlug]">) {
  return <NarratorProvider>{children}</NarratorProvider>;
}
