"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Catches anything a page throws, so a failure shows a readable message instead
 * of a blank screen. A missing database is handled earlier, by the layout.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="grid gap-2">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          This page could not be shown. The full details are in the terminal running the
          app.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
        ) : null}
      </div>

      <Button onClick={reset} size="lg" className="h-11">
        Try again
      </Button>
    </div>
  );
}