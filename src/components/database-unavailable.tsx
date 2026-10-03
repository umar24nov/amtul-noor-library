"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Shown instead of the page content when the database cannot be reached. Reading
 * the cause from the thrown error is not reliable, because Next.js only passes a
 * message and a digest to error boundaries, so availability is checked directly
 * by the layout.
 */
export function DatabaseUnavailable() {
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="grid gap-2">
        <h1 className="text-xl font-semibold">Cannot reach the database</h1>
        <p className="text-sm text-muted-foreground">
          The app is running, but PostgreSQL is not answering. During development the
          database runs in a separate terminal.
        </p>
      </div>

      <pre className="w-full overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-left text-xs">
        npm run db:local start
      </pre>

      <p className="text-xs text-muted-foreground">
        Then try again. Nothing is lost, the data is on disk.
      </p>

      <Button size="lg" className="h-11" onClick={() => router.refresh()}>
        Try again
      </Button>
    </div>
  );
}