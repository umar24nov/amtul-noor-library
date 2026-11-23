"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Receipt,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

type NavItem = {
  suffix: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  { suffix: "", label: "Overview", icon: LayoutDashboard, exact: true },
  { suffix: "/details", label: "Details", icon: UserRound },
  { suffix: "/payments", label: "Payments", icon: CreditCard, exact: true },
  { suffix: "/payments/history", label: "History", icon: Receipt },
  { suffix: "/email", label: "Email", icon: Mail },
  { suffix: "/support", label: "Support", icon: LifeBuoy },
];

/** Section navigation for the member area, with an active state on each route. */
export function PortalNav({ token }: { token: string }) {
  const pathname = usePathname();
  const base = `/pay/${token}`;

  return (
    <nav
      aria-label="Member portal sections"
      className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {ITEMS.map(({ suffix, label, icon: Icon, exact }) => {
          const href = `${base}${suffix}`;
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
