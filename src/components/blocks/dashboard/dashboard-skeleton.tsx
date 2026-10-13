import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the dashboard (top bar, hero, module grid) while it loads. */
export function DashboardSkeleton() {
  return (
    <div role="status" className="flex min-h-dvh flex-col">
      <span className="sr-only">Loading your course…</span>
      <div className="flex h-16 items-center gap-4 border-b border-surface-2 px-gutter">
        <Skeleton className="size-12 rounded-pill" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-gutter py-10 lg:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-8 w-48 rounded-pill" />
            <Skeleton className="h-14 w-80 max-w-full md:h-20 md:w-[28rem]" />
            <Skeleton className="h-5 w-72 max-w-full" />
            <Skeleton className="h-14 w-56 rounded-pill" />
          </div>
          <Skeleton className="size-32 rounded-pill" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
