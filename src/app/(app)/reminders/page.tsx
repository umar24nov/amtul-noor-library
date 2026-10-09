import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarClock, CheckCircle2, MessageCircle, TriangleAlert, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatMonth } from "@/lib/format";
import { listOverdueReminders } from "@/lib/queries";
import { overdueReminderUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  const reminders = await listOverdueReminders();

  const membersBehind = reminders.length;
  const totalDue = reminders.reduce((total, row) => total + row.totalDue, 0);
  const longOverdue = reminders.filter((row) => row.monthsCount >= 2).length;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Reminders"
        description="Fee payments that have gone too long. Everything here is for months that have already ended."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Members Behind"
          value={membersBehind}
          hint="Owing a finished month"
          icon={BellRing}
          tone={membersBehind > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Total Due"
          value={formatINR(totalDue)}
          hint="Across every overdue month"
          icon={Wallet}
        />
        <StatCard
          label="Two Months Or More"
          value={longOverdue}
          hint="Gone the longest"
          icon={TriangleAlert}
          tone={longOverdue > 0 ? "warning" : "success"}
        />
      </div>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-2 py-12 text-center">
            <CheckCircle2 className="size-7 text-success" />
            <p className="font-medium">Nothing overdue</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Every active member is up to date with the months that have finished. Nice work.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {membersBehind} {membersBehind === 1 ? "member" : "members"} to follow up with
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Table on larger screens */}
            <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-3 py-2 font-medium">Member</th>
                    <th className="px-3 py-2 font-medium">Months due</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Oldest</th>
                    <th className="px-3 py-2 text-right font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reminders.map((row) => {
                    const href = overdueReminderUrl(row.mobile, {
                      name: row.name,
                      months: row.months,
                      totalDue: row.totalDue,
                    });
                    return (
                      <tr key={row.memberPk}>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/members/${row.memberPk}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {row.name}
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.memberId}
                            {row.seatLabel ? ` · ${row.seatLabel}` : ""}
                          </p>
                        </td>
                        <td className="max-w-56 px-3 py-2.5">
                          <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning-foreground">
                            {row.monthsCount} {row.monthsCount === 1 ? "month" : "months"}
                          </span>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.months.map((month) => formatMonth(month)).join(", ")}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          {formatINR(row.totalDue)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatMonth(row.oldestMonth)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium underline-offset-2 hover:border-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                                aria-label={`Send ${row.name} a WhatsApp reminder`}
                              >
                                <MessageCircle className="size-4" />
                                Remind
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">No mobile</span>
                            )}
                            <Button asChild variant="ghost" size="sm" className="h-9">
                              <Link href={`/payments?memberId=${row.memberId}`}>
                                <CalendarClock className="size-4" />
                                Record
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards on phones */}
            <ul className="grid gap-2 sm:hidden">
              {reminders.map((row) => {
                const href = overdueReminderUrl(row.mobile, {
                  name: row.name,
                  months: row.months,
                  totalDue: row.totalDue,
                });
                return (
                  <li key={row.memberPk} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/members/${row.memberPk}`}
                          className="block truncate font-medium underline-offset-2 hover:underline"
                        >
                          {row.name}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{row.memberId}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning-foreground">
                        {row.monthsCount} {row.monthsCount === 1 ? "month" : "months"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {row.months.map((month) => formatMonth(month)).join(", ")}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-medium tabular-nums">{formatINR(row.totalDue)}</span>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium underline-offset-2 hover:border-foreground"
                        >
                          <MessageCircle className="size-4" />
                          Remind
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No mobile</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
