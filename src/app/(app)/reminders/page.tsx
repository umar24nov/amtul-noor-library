import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CheckCircle2, ReceiptIndianRupee, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SubNav } from "@/components/sub-nav";
import { PaymentReminders } from "@/components/payment-reminders";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterField } from "@/components/filters";
import { MonthStepper } from "@/components/month-stepper";
import {
  MONTH_FILTER_PAD_FORWARD,
  PAYMENT_TABS,
} from "@/lib/constants";
import { currentMonthKey, formatINR, formatMonth } from "@/lib/format";
import { getSession } from "@/lib/auth";
import { listPaymentReminders, listSelectableMonths } from "@/lib/queries";

export const metadata: Metadata = { title: "This month's dues" };

type SearchParams = Promise<{ month?: string }>;

/**
 * The "This month" tab of Payments: who still owes the chosen month, each with a
 * one-tap WhatsApp reminder. This is the month-in-progress view; months that have
 * already ended are followed up on the Overdue tab instead.
 */
export default async function MonthDuesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  const params = await searchParams;

  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "")
    ? params.month!
    : currentMonthKey();

  const [reminders, months] = await Promise.all([
    listPaymentReminders(month),
    listSelectableMonths(MONTH_FILTER_PAD_FORWARD),
  ]);

  const dueTotal = reminders.reduce((total, row) => total + row.due, 0);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="This month's dues"
        description={`Active members who still owe ${formatMonth(month)}, each with a one-tap reminder.`}
        below={<SubNav items={PAYMENT_TABS} level={session?.level ?? "DAY_TO_DAY"} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Members Still Due"
          value={reminders.length}
          hint={reminders.length === 0 ? "Everyone is settled" : "For the chosen month"}
          icon={TriangleAlert}
          tone={reminders.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Amount Due"
          value={formatINR(dueTotal)}
          hint="Across those members"
          icon={ReceiptIndianRupee}
        />
        <StatCard
          label="Month"
          value={formatMonth(month)}
          hint="Change it below"
          icon={CalendarClock}
          tone="muted"
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end sm:justify-between">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FilterField label="Month" className="sm:w-64">
              <MonthStepper value={month} months={months} />
            </FilterField>
            <Button type="submit" size="lg" variant="outline" className="h-10 sm:mb-px">
              Show dues
            </Button>
          </form>
          <Button asChild variant="ghost" size="sm" className="h-9 self-start">
            <Link href="/payments/overdue">Older months overdue &rarr;</Link>
          </Button>
        </CardContent>
      </Card>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-2 py-12 text-center">
            <CheckCircle2 className="size-7 text-success" />
            <p className="font-medium">Everyone is settled for {formatMonth(month)}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              No active member owes this month. Any month that has already ended with money still
              out lives on the Overdue tab.
            </p>
          </CardContent>
        </Card>
      ) : (
        <PaymentReminders rows={reminders} month={month} />
      )}
    </div>
  );
}
