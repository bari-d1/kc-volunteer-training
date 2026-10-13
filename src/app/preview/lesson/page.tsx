import { LessonPreview } from "./lesson-preview";
import { mockCourse } from "@/lib/mock-course";

export default function LessonPreviewPage() {
  const current =
    mockCourse.modules.find((m) => m.status === "in-progress") ??
    mockCourse.modules[0];

  return <LessonPreview moduleId={current.id} />;
}
