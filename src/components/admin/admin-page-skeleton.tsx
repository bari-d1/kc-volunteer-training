import { Skeleton } from "@/components/ui/skeleton";

/** Shown while an admin page checks the session and loads its data. */
export function AdminPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
