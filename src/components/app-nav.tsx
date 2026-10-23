"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { NAV_ITEMS } from "@/lib/constants";
import type { PermissionKey } from "@/lib/permission-defs";

const ICONS = {
  "/dashboard": "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  "/members": "M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 2a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-2.33 0-7 1.17-7 3.5V21h8v-2.5c0-.83.38-1.6 1-2.19A12.6 12.6 0 0 0 8 15Zm8 0c-2.67 0-8 1.33-8 4v2h16v-2c0-2.67-5.33-4-8-4Z",
  "/applications": "M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM9 12h6v1.5H9V12Zm0 3h6v1.5H9V15Zm0 3h4v1.5H9V18Z",
  "/payments": "M3 6h18v12H3V6Zm2 2v8h14V8H5Zm2 2h6v2H7v-2Zm0 4h4v1H7v-1Z",
  "/reminders": "M12 2a6 6 0 0 0-6 6v3.6L4.3 14a1 1 0 0 0 .9 1.5h13.6a1 1 0 0 0 .9-1.5L18 11.6V8a6 6 0 0 0-6-6Zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z",
  "/seats": "M5 3h5v7H5V3Zm0 9h5v7H5v-7Zm9-9h5v7h-5V3Zm0 9h5v7h-5v-7ZM4 10h16v2H4v-2Z",
  "/expenses": "M3 6h18v2H3V6Zm0 4h18v2H3v-2Zm0 4h12v2H3v-2Zm14 2h4v4h-4v-4Z",
  "/users":
    "M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.61c0-1.18.68-2.26 1.76-2.73 1.17-.52 2.61-.91 4.24-.91ZM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Zm1.13 1.1c-.37-.06-.74-.1-1.13-.1-.99 0-1.93.21-2.78.58C.48 14.9 0 15.62 0 16.43V18h4.5v-1.61c0-.83.23-1.61.63-2.29ZM20 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Zm4 3.43c0-.81-.48-1.53-1.22-1.85-.85-.37-1.79-.58-2.78-.58-.39 0-.76.04-1.13.1.4.68.63 1.46.63 2.29V18H24v-1.57ZM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3Z",
  "/profile":
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 13a7.5 7.5 0 0 1-5.6-2.5c1.2-1.2 3.4-1.9 5.6-1.9s4.4.7 5.6 1.9A7.5 7.5 0 0 1 12 19.5Z",
} as const;

function NavLinks({
  onNavigate,
  className,
  permissions,
}: {
  onNavigate?: () => void;
  className?: string;
  /** The areas this person's role grants. Only matching links are shown. */
  permissions: PermissionKey[];
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !item.permissions || item.permissions.some((key) => permissions.includes(key)),
  );

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
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

export function DesktopNav({ permissions }: { permissions: PermissionKey[] }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      <NavLinks permissions={permissions} />
    </nav>
  );
}

export function MobileNav({
  onNavigate,
  permissions,
}: {
  onNavigate?: () => void;
  permissions: PermissionKey[];
}) {
  return (
    <nav className="flex flex-col gap-1">
      <NavLinks onNavigate={onNavigate} permissions={permissions} />
    </nav>
  );
}