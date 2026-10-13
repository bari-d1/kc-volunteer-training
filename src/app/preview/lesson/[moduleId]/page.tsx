import { notFound } from "next/navigation";
import { LessonPreview } from "../lesson-preview";
import { mockCourse } from "@/lib/mock-course";

const unlocked = mockCourse.modules.filter((m) => m.status !== "locked");

export function generateStaticParams() {
  return unlocked.map((m) => ({ moduleId: m.id }));
}

export default async function ModulePreviewPage({
  params,
}: PageProps<"/preview/lesson/[moduleId]">) {
  const { moduleId } = await params;
  if (!unlocked.some((m) => m.id === moduleId)) notFound();

  return <LessonPreview moduleId={moduleId} />;
}
