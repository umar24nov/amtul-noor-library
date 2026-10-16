import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RolesPanel, type PanelRole } from "@/components/roles-panel";
import { UsersPanel, type PanelUser } from "@/components/users-panel";
import { getAdminSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Users",
};

/**
 * Who can sign in to the app, and the roles they sign in with. Admin only: people
 * on a day-to-day role never see this page, and the actions behind it check again,
 * because a form action can be called directly.
 */
export default async function UsersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/dashboard");

  const [roles, rows] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ level: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        level: true,
        builtIn: true,
        _count: { select: { users: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        lastLoginAt: true,
        role: { select: { id: true, name: true, level: true } },
      },
    }),
  ]);

  const roleOptions: PanelRole[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    level: role.level,
    builtIn: role.builtIn,
    userCount: role._count.users,
  }));

  const users: PanelUser[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    roleId: row.role.id,
    roleName: row.role.name,
    level: row.role.level,
    active: row.active,
    lastLoginAt: row.lastLoginAt ? formatDate(row.lastLoginAt) : null,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Users"
        description="Everyone who can sign in to the app, and the roles they use. Full admins manage accounts and the monthly fee; day-to-day roles run the library."
      />
      <UsersPanel users={users} roles={roleOptions} currentUserId={session.userId} />
      <RolesPanel roles={roleOptions} />
    </div>
  );
}
