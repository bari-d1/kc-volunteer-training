import { redirect } from "next/navigation";
import { DEFAULT_COURSE_SLUG } from "@/lib/course-config";

export default function CoursePage() {
  redirect(`/course/${DEFAULT_COURSE_SLUG}`);
}
