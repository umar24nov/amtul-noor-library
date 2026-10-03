import { cn } from "cn";

export function PageHeader({
  title,
  description,
  actions,
  below,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** A full width row under the title, for buttons that need their own space. */
  below?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {below}
    </div>
  );
}