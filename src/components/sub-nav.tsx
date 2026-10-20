"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import type { RoleLevel } from "@/generated/prisma/enums";

export type SubNavItem = {
  href: string;
  label: string;
  adminOnly: boolean;
};

/**
 * The tab strip that sits under a section heading (today: Payments).
 *
 * A client component because it highlights the current tab from the pathname.
 * Tabs an admin-only role cannot open are hidden, matching the sidebar. Each
 * item is matched on its own href, so `/payments` and `/payments/settings`
 * highlight independently.
 */
export function SubNav({ items, level }: { items: readonly SubNavItem[]; level: RoleLevel }) {
  const pathname = usePathname();
  const visible = items.filter((item) => !item.adminOnly || level === "ADMIN");

  if (visible.length < 2) return null;

  return (
    <nav aria-label="Section" className="-mb-px flex gap-1 overflow-x-auto">
      {visible.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
