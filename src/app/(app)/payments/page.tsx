import type { Metadata } from "next";
import Link from "next/link";
import { History, ReceiptIndianRupee, TriangleAlert, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ExportButton } from "@/components/export-button";
import { Pagination } from "@/components/pagination";
import { PaymentsToolbar } from "@/components/payments-toolbar";
import { PaymentEditDialog } from "@/components/payment-edit-dialog";
import { PaymentStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterField, MonthFilter, SearchInput, selectClassName } from "@/components/filters";
import { PAGE_SIZE, paymentModeLabels, paymentStatusLabels } from "@/lib/constants";
import { currentMonthKey, formatDate, formatINR, formatMonth } from "@/lib/format";
import { toNumber } from "@/lib/ids";
import {
  getPaymentStats,
  listActiveMembers,
  listPayments,
  listSelectableMonthOptions,
  listSelectableMonths,
} from "@/lib/queries";
import { getMonthlyFee } from "@/lib/settings";
import type { PaymentMode, PaymentStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Payments" };

type SearchParams = Promise<{
  month?: string;
  memberId?: string;
  q?: string;
  mode?: string;
  status?: string;
  page?: string;
}>;

const ALL = "ALL";

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : currentMonthKey();
  const memberFilter = params.memberId?.trim().toUpperCase() || undefined;
  const search = params.q ?? "";
  const mode = (params.mode as PaymentMode | undefined) ?? ALL;
  const status = (params.status as PaymentStatus | undefined) ?? ALL;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const [result, stats, fee, activeMembers, months, monthOptions] = await Promise.all([
    listPayments({ month, memberId: memberFilter, memberSearch: search, mode, status, page }),
    getPaymentStats(month),
    getMonthlyFee(),
    listActiveMembers(),
    listSelectableMonths(),
    listSelectableMonthOptions(),
  ]);

  const members = activeMembers.map((member) => ({
    id: member.id,
    name: member.name,
    memberId: member.memberId,
    mobile: member.mobile,
    seatLabel: member.seat
      ? `${member.seat.room.name} · Seat ${member.seat.seatNumber}`
      : null,
  }));

  const filterParams: Record<string, string | undefined> = {
    month,
    memberId: memberFilter,
    q: search || undefined,
    mode: mode !== ALL ? mode : undefined,
    status: status !== ALL ? status : undefined,
  };

  const listTotal = result.payments.reduce(
    (total, payment) => total + toNumber(payment.amount),
    0,
  );

  // Export mirrors the filters above, so the spreadsheet matches what is on screen.
  const exportQuery = new URLSearchParams();
  if (month) exportQuery.set("month", month);
  if (memberFilter) exportQuery.set("memberId", memberFilter);
  if (mode !== ALL) exportQuery.set("mode", mode);
  if (status !== ALL) exportQuery.set("status", status);
  const exportHref = `/api/export/payments?${exportQuery.toString()}`;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Payments"
        description="Every payment is a separate record, kept forever."
        actions={
          <div className="grid w-full gap-2 sm:w-auto">
            <PaymentsToolbar
              members={members}
              fee={fee}
              month={month}
              months={monthOptions}
            />
            <ExportButton
              href={exportHref}
              label="Export to Excel"
              description="Download the payments shown by these filters, plus totals"
              className="w-full"
            />
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`${formatMonth(month)} Collection`}
          value={formatINR(stats.monthCollection)}
          hint={`${stats.monthPaidCount} members settled`}
          icon={ReceiptIndianRupee}
        />
        <StatCard
          label="Pending This Month"
          value={stats.monthPendingCount}
          hint={`${formatINR(stats.monthPendingAmount)} due`}
          icon={TriangleAlert}
          tone={stats.monthPendingCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label="All Time Collection"
          value={formatINR(stats.allTimeCollection)}
          hint="Every paid record"
          icon={Wallet}
        />
        <StatCard
          label="Standard Monthly Fee"
          value={formatINR(fee)}
          hint="Used for pending amounts"
          icon={History}
          tone="muted"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filter payments</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3">
            <SearchInput
              defaultValue={search}
              placeholder="Search by member name, mobile or member ID"
              standalone={false}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FilterField label="Month">
                <MonthFilter value={month} months={months} />
              </FilterField>

              <FilterField label="Member ID">
                <input
                  type="text"
                  name="memberId"
                  defaultValue={memberFilter ?? ""}
                  placeholder="e.g. ATN003"
                  className={selectClassName}
                  aria-label="Filter by member ID"
                />
              </FilterField>

              <FilterField label="Payment mode">
                <select
                  name="mode"
                  defaultValue={mode}
                  className={selectClassName}
                  aria-label="Filter by payment mode"
                >
                  <option value={ALL}>All modes</option>
                  {(Object.keys(paymentModeLabels) as PaymentMode[]).map((value) => (
                    <option key={value} value={value}>
                      {paymentModeLabels[value]}
                    </option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Status">
                <select
                  name="status"
                  defaultValue={status}
                  className={selectClassName}
                  aria-label="Filter by payment status"
                >
                  <option value={ALL}>All statuses</option>
                  {(Object.keys(paymentStatusLabels) as PaymentStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {paymentStatusLabels[value]}
                    </option>
                  ))}
                </select>
              </FilterField>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg" className="h-10">
                Apply filters
              </Button>
              <Button asChild variant="ghost" size="lg" className="h-10">
                <Link href="/payments">Reset</Link>
              </Button>
              <ExportButton
                href="/api/export/payments"
                label="Export all months"
                description="Download every payment record, ignoring the filters"
                size="lg"
                variant="ghost"
                className="h-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Exports include every matching record, not only the page on screen.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {formatMonth(month)} · {result.total} {result.total === 1 ? "record" : "records"}
            {result.total > 0 && (
              <span className="ml-2 font-normal text-muted-foreground">
                totalling {formatINR(listTotal)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payment records match these filters.
            </p>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border border-border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2 font-medium">Payment ID</th>
                      <th className="px-3 py-2 font-medium">Member</th>
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                          {payment.paymentId}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/members/${payment.member.id}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {payment.member.name}
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground">
                            {payment.member.memberId}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {formatMonth(payment.month)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          {formatINR(payment.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {paymentModeLabels[payment.paymentMode]}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-3 py-2.5">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <PaymentEditDialog
                            payment={{ ...payment, amount: String(payment.amount) }}
                            fee={fee}
                            members={members}
                            months={monthOptions}
                            member={{
                              name: payment.member.name,
                              memberId: payment.member.memberId,
                              mobile: payment.member.mobile,
                              seatLabel: payment.member.seat
                                ? `${payment.member.seat.room.name} · Seat ${payment.member.seat.seatNumber}`
                                : null,
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="grid gap-2 md:hidden">
                {result.payments.map((payment) => (
                  <li key={payment.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/members/${payment.member.id}`}
                          className="block truncate font-medium underline-offset-2 hover:underline"
                        >
                          {payment.member.name}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">
                          {payment.paymentId} · {payment.member.memberId}
                        </p>
                      </div>
                      <PaymentStatusBadge status={payment.status} />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold tabular-nums">
                          {formatINR(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatMonth(payment.month)} · {paymentModeLabels[payment.paymentMode]} ·{" "}
                          {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                      <PaymentEditDialog
                        payment={{ ...payment, amount: String(payment.amount) }}
                        fee={fee}
                        members={members}
                        months={monthOptions}
                        compact
                        member={{
                          name: payment.member.name,
                          memberId: payment.member.memberId,
                          mobile: payment.member.mobile,
                          seatLabel: null,
                        }}
                      />
                    </div>

                    {payment.remarks && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{payment.remarks}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Pagination
        pathname="/payments"
        searchParams={filterParams}
        page={page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={PAGE_SIZE}
        unit="payment records"
      />
    </div>
  );
}