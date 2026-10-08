import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatMonth } from "@/lib/format";

export type RevenuePoint = {
  month: string;
  total: number;
};

/**
 * A simple twelve-month revenue bar chart, drawn with divs rather than a chart
 * library. The dashboard is the only place it is used, so a whole dependency
 * for one chart is not worth it: bars, a title and a tooltip tell the owner
 * what a month collected at a glance.
 */
export function RevenueChart({
  series,
  highlighted,
}: {
  /** Newest month first; this is what the dashboard page already queries. */
  series: RevenuePoint[];
  /** The month the dashboard is currently showing, drawn stronger. */
  highlighted: string;
}) {
  const max = Math.max(1, ...series.map((point) => point.total));
  const focused = series.find((point) => point.month === highlighted);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          Last 12 months collection
          {focused && (
            <span className="font-normal text-muted-foreground">
              {formatMonth(focused.month)} collected {formatINR(focused.total)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-44 items-end gap-1.5" aria-hidden="true">
          {series.map((point) => {
            const share = Math.max(point.total / max, 0.02);
            const isFocused = point.month === highlighted;
            return (
              <div
                key={point.month}
                title={`${formatMonth(point.month)} · ${formatINR(point.total)}`}
                className={
                  isFocused
                    ? "h-full flex-1 rounded-t-md bg-primary"
                    : "h-full flex-1 rounded-t-md bg-primary/25"
                }
                style={{ height: `${share * 100}%` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {series.map((point) => (
            <span
              key={point.month}
              className="flex-1 truncate text-center text-[0.65rem] text-muted-foreground"
            >
              {formatMonth(point.month).split(" ")[0]}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Paid records only, from the 12 months up to {formatMonth(series[0]?.month ?? highlighted)}.
          Hover a bar to see the exact amount.
        </p>
      </CardContent>
    </Card>
  );
}