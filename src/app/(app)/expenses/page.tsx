import type { Metadata } from "next";
import Link from "next/link";
import { FileDown, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ExportButton } from "@/components/export-button";
import { cn } from "@/lib/utils";
import { formatDate, formatINR } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSession, requirePermission } from "@/lib/permissions";
import { ExpensesManager } from "@/components/expenses-manager";
import { MoneyKeptAddButton } from "@/components/money-kept-manager";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requirePermission("EXPENSES");
  const { view } = await searchParams;
  const currentView = view === "money-kept" ? "money-kept" : "expenses";

  const [expenses, moneyKept, session] = await Promise.all([
    prisma.expense.findMany({
      orderBy: [{ date: "asc" }, { expenseId: "asc" }, { id: "asc" }],
    }),
    prisma.moneyKept.findMany({
      orderBy: [{ date: "asc" }, { id: "asc" }],
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
        description="Money going out and money kept."
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

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/expenses"
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors border border-transparent hover:border-border",
            currentView === "expenses"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Expenses
        </Link>
        <Link
          href="/expenses?view=money-kept"
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors border border-transparent hover:border-border",
            currentView === "money-kept"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Money Kept
        </Link>
      </div>

      {currentView === "expenses" ? (
        <div className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Expenses</h2>
          </div>
          <div className="p-4">
            <ExpensesManager expenses={expenses} canEdit={canEdit} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Money Kept</h2>
            {canEdit ? <MoneyKeptAddButton /> : null}
          </div>
          <div className="p-4">
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
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {moneyKept.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{formatDate(item.date)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{item.moneyKeptId}</td>
                        <td className="px-3 py-2.5">{item.person}</td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatINR(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
