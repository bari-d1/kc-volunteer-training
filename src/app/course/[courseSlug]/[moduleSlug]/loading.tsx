import { LessonSkeleton } from "@/components/blocks/lesson-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-gutter py-16">
      <LessonSkeleton />
    </div>
  );
}
