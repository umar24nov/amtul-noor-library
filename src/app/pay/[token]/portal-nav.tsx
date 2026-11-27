"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  CreditCard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Receipt,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LIBRARY_NAME } from "@/lib/constants";

type NavItem = {
  suffix: string;
  label: string;
  icon: LucideIcon;
  /** Exact routes do not claim nested children. */
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  {
    suffix: "/details",
    label: "My details",
    icon: UserRound,
  },
  {
    suffix: "/payments",
    label: "Payments",
    icon: CreditCard,
    exact: true,
  },
  {
    suffix: "/payments/history",
    label: "History",
    icon: Receipt,
    exact: true,
  },
  {
    suffix: "/email",
    label: "Email & sign-in",
    icon: Mail,
    exact: true,
  },
  {
    suffix: "/support",
    label: "Help & support",
    icon: LifeBuoy,
    exact: true,
  },
  {
    suffix: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

function useActiveHref(base: string) {
  const pathname = usePathname();

  return (item: NavItem) => {
    const href = `${base}${item.suffix}`;
    if (item.suffix === "/details") {
      return pathname === base || pathname === href || pathname.startsWith(`${href}/`);
    }
    return item.exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  };
}

function NavLinks({
  base,
  onNavigate,
}: {
  base: string;
  onNavigate?: () => void;
}) {
  const isActive = useActiveHref(base);

  return (
    <nav aria-label="Member portal sections" className="flex flex-col gap-1">
      {ITEMS.map(({ suffix, label, description, icon: Icon, exact }) => {
        const href = `${base}${suffix}`;
        const active = isActive({ suffix, label, description, icon: Icon, exact });
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg ring-1 transition-colors",
                active
                  ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300"
                  : "bg-sidebar-accent/50 text-sidebar-foreground/70 ring-sidebar-border group-hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{label}</span>
              <span
                className={cn(
                  "block truncate text-[11px] font-normal",
                  active ? "text-sidebar-foreground/60" : "text-sidebar-foreground/50",
                )}
              >
                {description}
              </span>
            </span>
            <ChevronRight
              className={cn(
                "size-3.5 shrink-0 transition-transform",
                active
                  ? "text-sidebar-foreground/50"
                  : "text-sidebar-foreground/40 group-hover:translate-x-0.5 group-hover:text-sidebar-foreground",
              )}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </nav>
  );
}

function SignOut({
  signOutAction,
  compact = false,
}: {
  signOutAction?: () => Promise<void>;
  compact?: boolean;
}) {
  if (!signOutAction) {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-[11px] leading-relaxed text-sidebar-foreground/70">
        <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Read-only staff preview. Member controls stay hidden.
      </p>
    );
  }

  return (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="outline"
        size={compact ? "default" : "sm"}
        className={cn(
          "w-full border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
          compact && "h-11",
        )}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign Out
      </Button>
    </form>
  );
}

/**
 * The private-area navigation. On desktop it is a permanent sidebar; on small
 * screens the same links live in a slide-over sheet. It never includes the
 * public site navigation.
 */
export function PortalNav({
  token,
  memberId,
  staffAllowed,
  signOutAction,
}: {
  token: string;
  memberId: string;
  staffAllowed: boolean;
  signOutAction?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const base = `/pay/${token}`;
  const homeHref = `${base}/details`;

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-5 py-5">
        <Link
          href={homeHref}
          onClick={() => setOpen(false)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/60"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="font-heading block truncate text-[15px] font-semibold tracking-tight">
              {LIBRARY_NAME}
            </span>
            <span className="mt-0.5 block text-[11px] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
              Member portal
            </span>
          </span>
        </Link>
        <ThemeToggle className="size-9 shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
          Settings
        </p>
        <NavLinks base={base} onNavigate={() => setOpen(false)} />
      </div>

      <div className="border-t border-sidebar-border p-4">
        <SignOut signOutAction={signOutAction} />
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] lg:block">{sidebar}</aside>

      <div className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 text-foreground backdrop-blur-xl lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open member navigation">
              <Menu className="size-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[300px] border-0 bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Member navigation</SheetTitle>
              <SheetDescription>
                Move between your details, payments, history, email, support and settings.
              </SheetDescription>
            </SheetHeader>
            {sidebar}
          </SheetContent>
        </Sheet>

        <Link href={homeHref} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500 text-white">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="font-heading block truncate text-sm font-semibold">
              {LIBRARY_NAME}
            </span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Member portal
            </span>
          </span>
        </Link>

        <ThemeToggle className="size-9 shrink-0" />

        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {staffAllowed ? "Staff" : memberId}
        </span>
      </div>
    </>
  );
}
