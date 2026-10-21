import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown inside the dashboard shell while a page's data is being fetched, so a
 * slow query reads as "loading" instead of a frozen screen.
 */
export default function AppLoading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-full sm:w-96" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-5 w-28" />
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
