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
  const [expenses, moneyKept, session] = await Promise.all([
    prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
    prisma.moneyKept.findMany({
      orderBy: [{ date: "desc" }, { id: "desc" }],
    }),
    getSession(),
  ]);
  const canEdit = session ? session.level === "ADMIN" || session.permissions?.includes("EXPENSES") : false;
  const total = expenses.reduce((sum: number, item: { amount: unknown }) => sum + Number(item.amount), 0);
  const totalMoneyKept = moneyKept.reduce((sum: number, item: { amount: unknown }) => sum + Number(item.amount), 0);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Expenses"
        description="Money going out. Add expenses and track money kept."
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

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Expenses"
          value={formatINR(total)}
          hint={`${expenses.length} ${expenses.length === 1 ? "entry" : "entries"}`}
          icon={ReceiptText}
        />
        <StatCard
          label="Money Kept"
          value={formatINR(totalMoneyKept)}
          hint={`${moneyKept.length} ${moneyKept.length === 1 ? "entry" : "entries"}`}
          icon={ReceiptText}
          tone="muted"
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
          <CardTitle className="text-sm">Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesManager expenses={expenses} canEdit={canEdit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Money Kept</CardTitle>
        </CardHeader>
        <CardContent>
          {moneyKept.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Person</th>
                    <th className="px-3 py-2 font-medium">Purpose</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {moneyKept.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{formatDate(item.date)}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{item.moneyKeptId}</td>
                      <td className="px-3 py-2.5">{item.person}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{item.purpose ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatINR(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
