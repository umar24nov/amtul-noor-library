import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIBRARY_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <BookOpen className="size-7" aria-hidden="true" />
      </span>

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          404 — Not found
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          This page has gone missing
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for is not here. It may have moved, or the link
          may be mistyped.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button asChild size="lg" className="h-11">
          <Link href="/">Back to {LIBRARY_NAME}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-11">
          <Link href="/join">Apply for a seat</Link>
        </Button>
      </div>
    </main>
  );
}
