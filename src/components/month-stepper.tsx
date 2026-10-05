"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { MONTH_NAMES } from "@/lib/constants";
import {
  formatMonth,
  monthKeyRange,
  shiftMonthKey,
} from "@/lib/format";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

export type MonthStepperProps = {
  value: string;
  /** Every selectable `YYYY-MM` key, in any order. */
  months: string[];
  name?: string;
  label?: string;
  className?: string;
};

/**
 * Month picker for the dashboard and payments filters.
 *
 * This replaces a native select that listed every month at once. The range is
 * padded well past the data so a future month can be recorded, which meant the
 * list kept growing and got longer to scroll through each year. Arrows step one
 * month at a time and the grid jumps straight to one, so the size of the range
 * stops being something the user has to look at.
 *
 * Every control is a real submit button carrying `name={name}`, so choosing a
 * month submits the surrounding GET form. That means the other filters in the
 * same form are submitted alongside it and are never reset, and the arrows
 * still work with scripting unavailable.
 */
export function MonthStepper({
  value,
  months,
  name = "month",
  label = "Month",
  className,
}: MonthStepperProps) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // Ascending, so "previous" and "next" are simply the neighbours of the
  // current month rather than positions in a list that may arrive reversed.
  const range = useMemo(() => {
    const keys = months.filter((key) => MONTH_KEY.test(key)).sort();
    return { first: keys[0] ?? value, last: keys[keys.length - 1] ?? value };
  }, [months, value]);

  const selectedYear = value.slice(0, 4);
  // Year shown in the grid, and which year button is highlighted. Tracked
  // separately from `value` so browsing years does not change the selected month.
  const [grid, setGrid] = useState({ shown: selectedYear, active: selectedYear });

  // Follow the URL when it changes underneath us, e.g. the browser back button.
  // Adjusting during render rather than in an effect avoids rendering one frame
  // with the previous month still highlighted.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setGrid({ shown: selectedYear, active: selectedYear });
  }

  const years = useMemo(() => {
    const from = Number(range.first.slice(0, 4));
    const to = Number(range.last.slice(0, 4));
    const result: number[] = [];
    // A corrupt range must not spin here, so the span is bounded.
    for (let year = from; year <= to && result.length < 50; year += 1) result.push(year);
    return result;
  }, [range.first, range.last]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const previous = shiftMonthKey(value, -1);
  const next = shiftMonthKey(value, 1);
  const canGoBack = MONTH_KEY.test(value) && previous >= range.first;
  const canGoForward = MONTH_KEY.test(value) && next <= range.last;

  const gridMonths = useMemo(
    () => monthKeyRange(`${grid.shown}-01`, `${grid.shown}-12`),
    [grid.shown],
  );

  const shell =
    "flex h-11 items-center justify-between gap-1 rounded-lg border border-input bg-background";

  return (
    <div ref={wrapper} className={cn("relative min-w-0", className)}>
      <div className={shell}>
        <button
          type="submit"
          name={name}
          value={previous}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex size-11 shrink-0 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            setGrid({ shown: selectedYear, active: selectedYear });
            setOpen((wasOpen) => !wasOpen);
          }}
          aria-label={`${label}: ${formatMonth(value)}. Choose a month`}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="min-w-0 flex-1 truncate px-1 py-2 text-center text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {formatMonth(value)}
        </button>

        <button
          type="submit"
          name={name}
          value={next}
          disabled={!canGoForward}
          aria-label="Next month"
          className="flex size-11 shrink-0 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose month"
          className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-border bg-popover p-3 shadow-lg"
        >
          <div className="mb-2 flex flex-wrap gap-1">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setGrid({ shown: String(year), active: String(year) })}
                aria-pressed={String(year) === grid.active}
                className={cn(
                  "min-w-12 flex-1 rounded-md px-2 py-1.5 text-xs font-medium tabular-nums transition-colors",
                  String(year) === grid.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1">
            {gridMonths.map((key) => {
              const monthNumber = Number(key.slice(5, 7));
              const outside = key < range.first || key > range.last;
              const isSelected = key === value;
              return (
                <button
                  key={key}
                  type="submit"
                  name={name}
                  value={key}
                  disabled={outside}
                  aria-current={isSelected ? "true" : undefined}
                  className={cn(
                    "rounded-md px-1 py-2 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : outside
                        ? "cursor-not-allowed text-muted-foreground/35"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {MONTH_NAMES[monthNumber - 1].slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}