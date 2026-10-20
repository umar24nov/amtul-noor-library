import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ActivityPanel } from "@/components/activity-panel";
import { RolesPanel, type PanelRole } from "@/components/roles-panel";
import { UsersPanel, type PanelUser } from "@/components/users-panel";
import { listRecentActivity } from "@/lib/activity";
import { formatDate } from "@/lib/format";
import { effectivePermissions, PERMISSION_KEYS } from "@/lib/permission-defs";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Users",
};

/**
 * Who can sign in to the app, the roles they sign in with, and recent sign-in
 * activity. Needs the Users permission: a role without it never sees this page,
 * and the actions behind it check again, because a form action can be called
 * directly.
 */
export default async function UsersPage() {
  const session = await requirePermission("USERS");

  const [roles, rows, activity] = await Promise.all([
    prisma.role.findMany({
      orderBy: [{ level: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        level: true,
        builtIn: true,
        permissions: true,
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
    listRecentActivity(25),
  ]);

  const roleOptions: PanelRole[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    level: role.level,
    builtIn: role.builtIn,
    userCount: role._count.users,
    // A full admin effectively has every permission; the panel shows them ticked.
    permissions: effectivePermissions(role.level, role.permissions),
    allPermissions: [...PERMISSION_KEYS],
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
        description="Everyone who can sign in to the app, the roles they use, and who has been signing in."
      />
      <UsersPanel users={users} roles={roleOptions} currentUserId={session.userId} />
      <RolesPanel roles={roleOptions} />
      <ActivityPanel entries={activity} />
    </div>
  );
}
