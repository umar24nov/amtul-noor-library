import type { Metadata } from "next";
import Link from "next/link";
import { Armchair, CircleCheckBig, ReceiptIndianRupee, TriangleAlert, UserPlus, Users, UserRoundCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ExportButton } from "@/components/export-button";
import { PaymentStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthFilter } from "@/components/filters";
import { FilterSelect } from "@/components/filter-select";
import { paymentStatusLabels } from "@/lib/constants";
import { currentMonthKey, formatINR, formatMonth } from "@/lib/format";
import { getDashboardData, type MemberScope } from "@/lib/queries";

export const metadata: Metadata = { title: "Dashboard" };

const SCOPES = {
  ACTIVE: "Active members",
  LEFT: "Left members",
  ALL: "Active and left",
} as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month ?? "")
    ? params.month!
    : currentMonthKey();
  // Active members only by default, because the full list is long.
  const scope = (params.scope ?? "ACTIVE") as MemberScope;
  const memberScope = scope in SCOPES ? scope : "ACTIVE";

  const data = await getDashboardData(month, memberScope);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Dashboard"
        description={`Library status for ${formatMonth(month)}.`}
        actions={
          <form
            method="get"
            className="grid w-full gap-2 sm:w-auto sm:grid-cols-2"
            aria-label="Dashboard filters"
          >
            {/* Both selects live in this one form, so changing either keeps the other. */}
            <MonthFilter value={month} />
            <FilterSelect
              name="scope"
              value={memberScope}
              ariaLabel="Which members to list"
              options={Object.entries(SCOPES).map(([value, label]) => ({ value, label }))}
            />
          </form>
        }
        below={
          <div className="flex flex-wrap items-center gap-2">
            <ExportButton
              href={`/api/export/payments?month=${month}`}
              label="Export"
              description={`Download ${formatMonth(month)} payments as an Excel sheet`}
              className="h-11 flex-1 sm:flex-none sm:w-44"
            />
            <Button asChild size="lg" className="h-11 flex-1 sm:flex-none sm:w-44">
              <Link href="/members/new">
                <UserPlus className="size-4" />
                Add Member
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Members"
          value={data.totalMembers}
          hint="Everyone on record"
          icon={Users}
          href="/members"
        />
        <StatCard
          label="Active Members"
          value={data.activeMembers}
          hint={`${data.totalMembers - data.activeMembers} have left`}
          icon={UserRoundCheck}
          tone="success"
          href="/members?status=ACTIVE"
        />
        <StatCard
          label="Available Seats"
          value={data.availableSeats}
          hint={`Out of ${data.totalSeats} total`}
          icon={Armchair}
          href="/seats"
        />
        <StatCard
          label="Occupied Seats"
          value={data.occupiedSeats}
          hint={`${data.totalSeats - data.occupiedSeats} free right now`}
          icon={Armchair}
          tone="warning"
          href="/seats"
        />
        <StatCard
          label={`${formatMonth(month)} Collection`}
          value={formatINR(data.monthCollection)}
          hint="Received for this month"
          icon={ReceiptIndianRupee}
        />
        <StatCard
          label="Pending Payments"
          value={data.pendingCount}
          hint={
            data.pendingCount > 0
              ? `${formatINR(data.pendingAmount)} still due`
              : "Everyone is settled"
          }
          icon={TriangleAlert}
          tone={data.pendingCount > 0 ? "warning" : "success"}
          href={`/payments?month=${month}&status=PENDING`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {formatMonth(month)} fee status
            <span className="ml-2 font-normal text-muted-foreground">
              {data.summary.length} {data.summary.length === 1 ? "member" : "members"} ·{" "}
              {SCOPES[memberScope].toLowerCase()} · fee {formatINR(data.fee)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.summary.length === 0 ? (
            <div className="grid place-items-center gap-2 py-10 text-center">
              <CircleCheckBig className="size-6 text-success" />
              <p className="font-medium">
                {memberScope === "ACTIVE"
                  ? `No active members for ${formatMonth(month)}`
                  : `No members for ${formatMonth(month)}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {memberScope === "ACTIVE"
                  ? "Switch the filter to see members who have left."
                  : "Add a member to start recording payments."}
              </p>
              {memberScope !== "ACTIVE" && (
                <Button asChild variant="secondary" className="mt-2 h-10">
                  <Link href="/members/new">Add Member</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Table for tablet and desktop */}
              <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2 font-medium">Member</th>
                      <th className="px-3 py-2 text-right font-medium">Seat</th>
                      <th className="px-3 py-2 text-right font-medium">Fee</th>
                      <th className="px-3 py-2 text-right font-medium">Collected</th>
                      <th className="px-3 py-2 text-right font-medium">Due</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.summary.map((row) => (
                      <tr key={row.memberPk} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/members/${row.memberPk}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {row.name}
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground">
                            {row.memberId}
                            {row.memberStatus === "LEFT" && (
                              <span className="ml-1 font-sans">· left</span>
                            )}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {row.seatNumber ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {formatINR(data.fee)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          {formatINR(row.collected)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {row.due > 0 ? (
                            <span className="font-medium text-warning-foreground">
                              {formatINR(row.due)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {row.modes.length > 0 ? row.modes.join(", ") : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <PaymentStatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards for phones */}
              <ul className="grid gap-2 sm:hidden">
                {data.summary.map((row) => (
                  <li key={row.memberPk} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/members/${row.memberPk}`}
                          className="block truncate font-medium underline-offset-2 hover:underline"
                        >
                          {row.name}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">
                          {row.memberId} ·{" "}
                          {row.seatNumber ? `Seat ${row.seatNumber}` : "No seat"}
                        </p>
                      </div>
                      <PaymentStatusBadge status={row.status} />
                    </div>

                    <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-[0.7rem] text-muted-foreground">Fee</dt>
                        <dd className="tabular-nums">{formatINR(data.fee)}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.7rem] text-muted-foreground">Paid</dt>
                        <dd className="font-medium tabular-nums">{formatINR(row.collected)}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.7rem] text-muted-foreground">Due</dt>
                        <dd className="tabular-nums">
                          {row.due > 0 ? (
                            <span className="font-medium text-warning-foreground">
                              {formatINR(row.due)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {row.modes.length > 0 ? row.modes.join(", ") : "No payment mode recorded"}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-xs text-muted-foreground">
                Statuses:{" "}
                {(["PAID", "PENDING", "WAIVED", "ON_HOLD", "NOT_APPLICABLE"] as const)
                  .map((status) => paymentStatusLabels[status])
                  .join(" · ")}
                .
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}