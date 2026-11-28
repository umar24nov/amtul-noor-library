import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberStatusBadge } from "@/components/status-badges";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { PayFeesButton } from "../pay-fees-button";
import { getFeeSummary, getSeatLabel, loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import {
  Accent,
  Detail,
  PortalHero,
  SectionHeading,
  StatCard,
} from "../portal-ui";

export const metadata: Metadata = {
  title: "My details",
};

/** The member's record and the default page their link opens. */
export default async function MemberDetailsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed, staffAllowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  const summary = await getFeeSummary(member);

  const hero = (
    <PortalHero
      name={member.name}
      memberId={member.memberId}
      seatLabel={getSeatLabel(member)}
      joined={formatDate(member.joiningDate)}
      staffAllowed={staffAllowed}
    />
  );

  return (
    <PortalShell token={token} member={member} staffAllowed={staffAllowed} hero={hero}>
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          tone="indigo"
          label="Monthly fee"
          value={formatINR(summary.monthlyFee)}
          hint={summary.feeIsZero ? "Free under an offer" : "Your current plan"}
          href={`/pay/${token}/payments`}
        />
        <StatCard
          icon={CheckCircle2}
          tone="emerald"
          label="Paid months"
          value={String(summary.receiptCount)}
          hint={summary.receiptCount ? "Receipts ready to download" : "No receipts yet"}
          href={`/pay/${token}/payments/history`}
        />
        <StatCard
          icon={Clock}
          tone="amber"
          label="Pending"
          value={summary.feeIsZero ? "—" : String(summary.pendingCount)}
          hint={summary.feeIsZero ? "Nothing to pay" : summary.pendingCount ? "Months to settle" : "All clear"}
          href={`/pay/${token}/payments`}
        />
        <StatCard
          icon={UserRound}
          tone="sky"
          label="Seat"
          value={getSeatLabel(member)}
          hint="Allocated by the library"
        />
      </dl>

      {!summary.feeIsZero && summary.bankConfigured && (
        <section className="overflow-hidden rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-card to-card p-5 shadow-sm sm:p-6 dark:border-indigo-500/20 dark:from-indigo-500/10">
          <div className="relative">
            <SectionHeading
              icon={Landmark}
              tone="indigo"
              title="Pay by bank transfer (NEFT)"
              description={`Amount due · ${formatMonth(summary.dueMonth)} · ${formatINR(summary.dueAmount)}`}
            />

            <dl className="mt-4 grid gap-4 rounded-xl border border-border bg-muted/50 p-5 text-sm text-foreground sm:grid-cols-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Account holder
                </dt>
                <dd className="mt-1 break-words font-medium">{summary.bank.accountHolder}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Account number
                </dt>
                <dd className="mt-1 break-all font-mono font-medium">{summary.bank.accountNumber}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  IFSC code
                </dt>
                <dd className="mt-1 break-all font-mono font-medium">{summary.bank.ifsc}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PayFeesButton
                amount={formatINR(summary.dueAmount)}
                month={formatMonth(summary.dueMonth)}
                bank={summary.bank}
              />
              <Button asChild variant="outline" size="sm" className="h-9">
                <Link href={`/pay/${token}/payments`}>Open payments</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {summary.feeIsZero && (
        <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-100">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Nothing to pay right now. NEFT bank details appear here only when a fee is due.
            </span>
          </p>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <header className="flex items-start gap-3 border-b border-border bg-gradient-to-br from-card to-muted/40 p-5 sm:p-6">
          <Accent icon={UserRound} tone="indigo" size="lg" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Membership record
            </p>
            <h2 className="font-heading mt-1 text-xl font-semibold tracking-tight">
              Your details
            </h2>
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <LockKeyhole className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Managed by the library
              </p>
            </div>
            <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              <Detail label="Member ID" value={member.memberId} />
              <Detail label="Seat" value={getSeatLabel(member)} />
              <Detail
                label="Monthly fee"
                value={<span className="tabular-nums">{formatINR(summary.monthlyFee)}</span>}
              />
              <Detail label="Joined" value={formatDate(member.joiningDate)} />
              <Detail label="Status" value={<MemberStatusBadge status={member.status} />} />
              <Detail
                label="Payment link"
                value={<span className="text-xs text-muted-foreground">Private · yours only</span>}
              />
            </dl>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Yours to update
              </p>
            </div>
            <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              <Detail label="Full name" value={member.name} />
              <Detail label="Mobile" value={member.mobile ?? "—"} />
              <Detail label="Guardian" value={member.guardianName ?? "—"} />
              <Detail label="Guardian mobile" value={member.guardianMobile ?? "—"} />
            </dl>
          </div>
        </div>
      </section>
    </PortalShell>
  );
}
