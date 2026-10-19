"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

/**
 * Footer for a list that grows as you scroll instead of paging with Next/Previous.
 *
 * An IntersectionObserver on the sentinel starts the next batch as it comes into
 * view, so dragging down loads more on its own. The button stays as a fallback
 * for keyboard users and for the rare case where the observer never fires.
 */
export function LoadMoreFooter({
  loaded,
  total,
  unit,
  hasMore,
  loading,
  onLoadMore,
}: {
  /** How many rows are on screen right now. */
  loaded: number;
  total: number;
  unit: string;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  // Held in a ref so the observer is not torn down and rebuilt on every render.
  // The assignment belongs in an effect: writing to a ref during render is not
  // safe, because React can throw that render away.
  const loadMore = useRef(onLoadMore);
  useEffect(() => {
    loadMore.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore.current();
      },
      // Only fetch once the sentinel is genuinely on screen. A large margin
      // made the sentinel stay inside the trigger area batch after batch, so
      // the list kept auto-loading and the spinner never settled.
      { rootMargin: "0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (total === 0) return null;

  return (
    <div className="grid gap-3">
      <div ref={sentinel} aria-hidden="true" className="h-px w-full" />

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {hasMore ? (
            <>
              Showing <span className="tabular-nums">{formatNumber(loaded)}</span> of{" "}
              <span className="tabular-nums">{formatNumber(total)}</span> {unit}. Keep scrolling for
              more.
            </>
          ) : (
            <>
              All <span className="tabular-nums">{formatNumber(total)}</span> {unit} loaded.
            </>
          )}
        </p>

        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
