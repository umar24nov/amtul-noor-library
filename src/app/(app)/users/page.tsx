import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { UsersPanel, type PanelUser } from "@/components/users-panel";
import { getAdminSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Users",
};

/**
 * Who can sign in to the app. Admin only: staff never see this page, and the
 * actions behind it check again, because a form action can be called directly.
 */
export default async function UsersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/dashboard");

  const rows = await prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      lastLoginAt: true,
    },
  });

  const users: PanelUser[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    lastLoginAt: row.lastLoginAt ? formatDate(row.lastLoginAt) : null,
  }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Users"
        description="Everyone who can sign in to the app. Admins manage accounts and settings; staff run the day-to-day library."
      />
      <UsersPanel users={users} currentUserId={session.userId} />
    </div>
  );
}
