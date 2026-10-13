import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the lesson layout so content doesn't jump when it loads. */
export function LessonSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-8">
      <span className="sr-only">Loading lesson…</span>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32 rounded-pill" />
        <Skeleton className="h-10 w-4/5 md:h-14" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="h-8 w-1/2 md:h-10" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
      </div>
      <Skeleton className="h-40 w-full rounded-md" />
    </div>
  );
}
