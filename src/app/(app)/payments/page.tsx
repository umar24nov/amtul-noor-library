import type { Metadata } from "next";
import Link from "next/link";
import { History, ReceiptIndianRupee, TriangleAlert, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SubNav } from "@/components/sub-nav";
import { ExportButton } from "@/components/export-button";
import { PaymentsToolbar } from "@/components/payments-toolbar";
import { PaymentsTable } from "@/components/payments-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterField, SearchInput, selectClassName } from "@/components/filters";
import { MonthStepper } from "@/components/month-stepper";
import {
  MONTH_FILTER_PAD_FORWARD,
  PAYMENT_TABS,
  paymentModeLabels,
  paymentStatusLabels,
} from "@/lib/constants";
import { currentMonthKey, formatINR, formatMonth } from "@/lib/format";
import {
  getPaymentStats,
  listMemberOptions,
  listPayments,
  listSelectableMonthOptions,
  listSelectableMonths,
} from "@/lib/queries";
import { getMonthlyFee } from "@/lib/settings";
import { effectivePermissions } from "@/lib/permission-defs";
import { requirePermission } from "@/lib/permissions";
import type { PaymentMode, PaymentStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Payments" };

type SearchParams = Promise<{
  month?: string;
  memberId?: string;
  q?: string;
  mode?: string;
  status?: string;
  /** Numeric member id from a member page's "Record payment" button. */
  record?: string;
}>;

const ALL = "ALL";

/**
 * The "Collect" tab of Payments: one month at a time, every record with what it
 * collected. The heavier, rarely used jobs moved to their own tabs (see
 * PAYMENT_TABS) so this screen stays about money coming in.
 */
export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePermission("PAYMENTS");
  const permissions = effectivePermissions(session.level, session.permissions);
  const params = await searchParams;

  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "") ? params.month! : currentMonthKey();
  const memberFilter = params.memberId?.trim().toUpperCase() || undefined;
  const search = params.q ?? "";
  const mode = (params.mode as PaymentMode | undefined) ?? ALL;
  const status = (params.status as PaymentStatus | undefined) ?? ALL;
  // "Record payment" on a member page lands here; the dialog opens with that
  // member already selected so the fee can be collected without searching.
  const recordMemberId = /^\d+$/.test(params.record ?? "") ? Number(params.record) : null;

  const [result, stats, fee, members, months, monthOptions] = await Promise.all([
    listPayments({ month, memberId: memberFilter, memberSearch: search, mode, status }),
    getPaymentStats(month),
    getMonthlyFee(),
    listMemberOptions(),
    listSelectableMonths(MONTH_FILTER_PAD_FORWARD),
    listSelectableMonthOptions(),
  ]);

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
        below={<SubNav items={PAYMENT_TABS} permissions={permissions} />}
        actions={
          <div className="grid w-full gap-2 sm:w-auto">
            <PaymentsToolbar
              members={members}
              fee={fee}
              months={monthOptions}
              autoOpenMemberId={recordMemberId}
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

      {/* overflow-visible so the month picker's dropdown is not clipped by the
          Card's own overflow-hidden. */}
      <Card className="overflow-visible">
        <CardHeader className="flex-row items-center justify-between gap-3">
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
                <MonthStepper value={month} months={months} />
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
          </form>
        </CardContent>
      </Card>

      {/* overflow-visible so the sticky table header can follow the viewport;
          the Card's own overflow-hidden would trap it. */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="text-sm">
            {formatMonth(month)} · {result.total} {result.total === 1 ? "record" : "records"}
            {result.total > 0 && (
              <span className="ml-2 font-normal text-muted-foreground">
                totalling {formatINR(result.totalAmount)}
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
            // Keyed on the filters so changing one starts a fresh list instead
            // of appending rows that no longer match.
            <PaymentsTable
              key={`${month}|${memberFilter ?? ""}|${search}|${mode}|${status}`}
              payments={result.payments}
              members={members}
              fee={fee}
              months={monthOptions}
              total={result.total}
              query={{
                month,
                memberId: memberFilter,
                q: search,
                mode,
                status,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
