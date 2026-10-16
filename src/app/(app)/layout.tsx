import { redirect } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { DesktopNav } from "@/components/app-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import { isDatabaseReachable } from "@/lib/db-status";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const databaseIsUp = await isDatabaseReachable();
  // The role name is read fresh so a rename shows up without signing in again.
  const role = session.roleId
    ? await prisma.role.findUnique({ where: { id: session.roleId }, select: { name: true } })
    : null;
  const roleLabel = role?.name ?? (session.level === "ADMIN" ? "Admin" : "Staff");

  return (
    <div className="flex min-h-dvh bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex xl:w-64">
        {/* min-h + padding, and items-start, so the two-line motto grows the bar
            instead of overflowing into the navigation below it. */}
        <div className="flex min-h-14 items-start border-b border-sidebar-border px-4 py-3">
          <Link
            href="/"
            className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Brand />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-3">
          <DesktopNav level={session.level} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <p className="truncate px-1 text-xs font-medium text-foreground">
            {session.email}
          </p>
          <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{roleLabel}</p>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60 xl:pl-64">
        {/* Mobile / tablet top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
          <MobileMenu level={session.level} />
          <Link
            href="/"
            className="min-w-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Brand compact />
          </Link>
          <div className="ml-auto">
            <LogoutButton compact />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
          {databaseIsUp ? children : <DatabaseUnavailable />}
        </main>
      </div>
    </div>
  );
}