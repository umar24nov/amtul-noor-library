"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { NAV_ITEMS } from "@/lib/constants";

const ICONS = {
  "/dashboard": "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  "/members": "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 2a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-2.33 0-7 1.17-7 3.5V21h8v-2.5c0-.83.38-1.6 1-2.19A12.6 12.6 0 0 0 8 15Zm8 0c-2.67 0-8 1.33-8 4v2h16v-2c0-2.67-5.33-4-8-4Z",
  "/applications": "M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM9 12h6v1.5H9V12Zm0 3h6v1.5H9V15Zm0 3h4v1.5H9V18Z",
  "/payments": "M3 6h18v12H3V6Zm2 2v8h14V8H5Zm2 2h6v2H7v-2Zm0 4h4v1H7v-1Z",
  "/reminders": "M12 2a6 6 0 0 0-6 6v3.6L4.3 14a1 1 0 0 0 .9 1.5h13.6a1 1 0 0 0 .9-1.5L18 11.6V8a6 6 0 0 0-6-6Zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z",
  "/seats": "M5 3h5v7H5V3Zm0 9h5v7H5v-7Zm9-9h5v7h-5V3Zm0 9h5v7h-5v-7ZM4 10h16v2H4v-2Z",
} as const;

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              className={cn(
                "size-4.5 shrink-0",
                active ? "text-foreground" : "text-muted-foreground",
              )}
              fill="currentColor"
              aria-hidden="true"
            >
              <path d={ICONS[item.href as keyof typeof ICONS]} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DesktopNav() {
  return (
    <nav className="flex flex-col gap-1 px-3">
      <NavLinks />
    </nav>
  );
}

export function MobileNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      <NavLinks onNavigate={onNavigate} />
    </nav>
  );
}