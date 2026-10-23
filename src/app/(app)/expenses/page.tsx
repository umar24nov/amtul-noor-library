import type { Metadata } from "next";
import { FileDown, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ExportButton } from "@/components/export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatINR } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSession, requirePermission } from "@/lib/permissions";
import { ExpensesManager } from "@/components/expenses-manager";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  await requirePermission("EXPENSES");
  const [expenses, session] = await Promise.all([
    prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
    getSession(),
  ]);
  const canEdit = session ? session.level === "ADMIN" || session.permissions?.includes("EXPENSES") : false;
  const total = expenses.reduce((sum: number, item: { amount: unknown }) => sum + Number(item.amount), 0);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Expenses"
        description="Money going out. Add expenses, keep notes, and export to Excel."
      actions={
        session && (session.level === "ADMIN" || session.permissions?.includes("REPORTS")) ? (
          <ExportButton
            href="/api/export/expenses"
            label="Export to Excel"
            description="Download all expenses"
            className="h-11"
          />
        ) : null
      }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Total Expenses"
          value={formatINR(total)}
          hint={`${expenses.length} ${expenses.length === 1 ? "entry" : "entries"}`}
          icon={ReceiptText}
        />
        <StatCard
          label="Last Entry"
          value={expenses[0] ? formatDate(expenses[0].date) : "—"}
          hint={expenses[0]?.purpose ?? "Nothing added yet"}
          icon={FileDown}
          tone="muted"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesManager expenses={expenses} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
