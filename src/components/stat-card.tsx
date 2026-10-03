import Link from "next/link";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "muted";
  href?: string;
}) {
  const toneClasses = {
    default: "bg-muted text-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    muted: "bg-muted text-muted-foreground",
  } as const;

  const content = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "hover:border-foreground/25 hover:bg-accent/40",
      )}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            toneClasses[tone],
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  // A Link, not an <a>, so moving between pages does not reload the whole app.
  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {content}
    </Link>
  );
}