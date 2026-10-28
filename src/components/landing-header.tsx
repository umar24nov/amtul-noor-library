"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Brand } from "@/components/brand";

export type LandingNavItem = { href: string; label: string };

function DesktopLink({ href, label }: LandingNavItem) {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center rounded-full border border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:border-border hover:bg-muted hover:text-foreground focus-visible:border-border focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
      <span
        aria-hidden="true"
        className="absolute inset-x-3 bottom-0.5 h-px origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
    </Link>
  );
}

function MobileLink({
  href,
  label,
  onNavigate,
}: LandingNavItem & { onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted hover:text-foreground focus-visible:border-border focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
      <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
    </Link>
  );
}

/**
 * The landing page header. The section links, the Join us button and the mobile
 * menu all live here so one component owns the single join CTA on the page.
 *
 * Signing in is owner-only: nothing here links to /login, which is still
 * reachable by typing the address directly.
 */
export function LandingHeader({ items }: { items: LandingNavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="relative flex items-center justify-between gap-2 py-3">
          <Link
            href="/"
            className="min-w-0 shrink rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Brand compact />
          </Link>

          <nav
            aria-label="Page sections"
            className="hidden items-center gap-1 rounded-full border border-border/70 bg-background/60 p-1 shadow-sm md:flex lg:absolute lg:left-1/2 lg:-translate-x-1/2"
          >
            {items.map((item) => (
              <DesktopLink key={item.href} {...item} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild size="sm" className="h-8 px-2.5 text-xs sm:h-9 sm:px-4 sm:text-sm max-[380px]:hidden">
              <Link href="/join">Book your seat</Link>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 sm:size-9"
                  aria-label="Open navigation menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="border-b border-border p-4">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <Brand compact />
                </SheetHeader>
                <nav
                  aria-label="Page sections"
                  className="flex flex-col gap-1 p-3"
                >
                  <Link
                    href="/join"
                    onClick={() => setOpen(false)}
                    className="group hidden items-center gap-2 rounded-lg border border-foreground/10 bg-foreground px-3 py-2.5 text-sm font-medium text-background transition-all duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-[380px]:flex"
                  >
                    Book your seat
                    <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                  {items.map((item) => (
                    <MobileLink
                      key={item.href}
                      {...item}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}