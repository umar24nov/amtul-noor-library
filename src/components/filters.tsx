import { cn } from "cn";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchInput({
  defaultValue,
  placeholder = "Searchâ€¦",
  standalone = true,
  className,
}: {
  defaultValue?: string;
  placeholder?: string;
  /** Set to false when the search box sits inside another GET filter form. */
  standalone?: boolean;
  className?: string;
}) {
  const field = (
    <div className="relative flex-1">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 pl-8"
      />
    </div>
  );

  if (!standalone) {
    return <div className={cn("flex w-full items-center gap-2", className)}>{field}</div>;
  }

  return (
    <form method="get" className={cn("flex w-full items-center gap-2", className)}>
      {field}
      <Button type="submit" size="lg" className="h-11 px-4">
        Search
      </Button>
      {defaultValue ? (
        <Button asChild variant="ghost" size="lg" className="h-11">
          <a href="?">Clear</a>
        </Button>
      ) : null}
    </form>
  );
}

/** Wraps filter controls in a GET form that preserves the current path. */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <form method="get" className={cn("flex flex-col gap-2 sm:flex-row sm:items-end", className)}>
      {children}
    </form>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export const selectClassName =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";