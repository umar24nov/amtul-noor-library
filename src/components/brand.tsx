import { cn } from "cn";
import { BookOpen } from "lucide-react";
import { LIBRARY_NAME, LIBRARY_TAGLINE } from "@/lib/constants";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpen className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight tracking-tight">
          {LIBRARY_NAME}
        </span>
        {!compact && (
          <span className="block truncate text-xs leading-tight text-muted-foreground">
            {LIBRARY_TAGLINE}
          </span>
        )}
      </span>
    </div>
  );
}