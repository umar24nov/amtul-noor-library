import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

function buildHref(
  pathname: string,
  searchParams: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function Pagination({
  pathname,
  searchParams,
  page,
  pageCount,
  total,
  pageSize,
  unit = "records",
}: {
  pathname: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  unit?: string;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? (
          `No ${unit}`
        ) : (
          <>
            Showing <span className="tabular-nums">{formatNumber(first)}</span>–
            <span className="tabular-nums">{formatNumber(last)}</span> of{" "}
            <span className="tabular-nums">{formatNumber(total)}</span> {unit}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="default"
          className={cn("h-10 px-3", page <= 1 && "pointer-events-none opacity-50")}
          aria-disabled={page <= 1}
        >
          <Link href={buildHref(pathname, searchParams, Math.max(1, page - 1))}>
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        </Button>

        <span className="text-sm tabular-nums text-muted-foreground">
          {page} / {pageCount}
        </span>

        <Button
          asChild
          variant="outline"
          size="default"
          className={cn("h-10 px-3", page >= pageCount && "pointer-events-none opacity-50")}
          aria-disabled={page >= pageCount}
        >
          <Link href={buildHref(pathname, searchParams, Math.min(pageCount, page + 1))}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}