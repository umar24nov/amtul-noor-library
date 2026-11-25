import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatMonth } from "@/lib/format";
import { PayFeesButton } from "../pay-fees-button";
import { PaymentConfirmation } from "../payment-confirmation";
import { getFeeSummary, loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import { PageIntro, SectionHeading, StatCard } from "../portal-ui";

export const metadata: Metadata = {
  title: "Payments",
};

/** The fees page: what is due, how to pay by NEFT, and a WhatsApp confirmation. */
export default async function MemberPaymentsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed, staffAllowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  const summary = await getFeeSummary(member);

  return (
    <PortalShell token={token} member={member} staffAllowed={staffAllowed}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
        <PageIntro
          icon={CreditCard}
          tone="sky"
          eyebrow="Fees"
          title="Payments"
          description="See what is due and how to transfer it. Every confirmed month appears in your payment history."
          action={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {!summary.feeIsZero && summary.bankConfigured && (
              <PayFeesButton
                amount={formatINR(summary.dueAmount)}
                month={formatMonth(summary.dueMonth)}
                bank={summary.bank}
              />
            )}
            <Button asChild variant="outline" size="sm" className="h-9 w-full sm:w-auto">
              <Link href={`/pay/${token}/payments/history`}>
                <Receipt className="size-3.5" />
                View history
              </Link>
            </Button>
            </div>
          }
        />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon={Wallet}
          tone="indigo"
          label="Monthly fee"
          value={formatINR(summary.monthlyFee)}
          hint="Your current plan"
        />
        <StatCard
          icon={Clock}
          tone="amber"
          label="Pending"
          value={summary.feeIsZero ? "—" : String(summary.pendingCount)}
          hint={summary.feeIsZero ? "Nothing to pay" : summary.pendingCount ? "Months to settle" : "All clear"}
        />
        <StatCard
          icon={CalendarDays}
          tone="sky"
          label="Next due"
          value={summary.feeIsZero ? "—" : formatMonth(summary.dueMonth)}
          hint={summary.feeIsZero ? "No upcoming fee" : "Upcoming billing month"}
        />
        <StatCard
          icon={CheckCircle2}
          tone="emerald"
          label="Receipts"
          value={String(summary.receiptCount)}
          hint="Ready to download"
        />
      </dl>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 max-w-4xl">
        {summary.feeIsZero ? (
          <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-card to-card p-6 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10">
            <div className="absolute -right-12 -top-12 size-40 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
            <div className="relative flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                <Sparkles className="size-6" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight">Nothing to pay right now</h2>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                  Your membership is free under an offer — there is no fee to transfer. Enjoy the library!
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                  <CheckCircle2 className="size-3.5" />
                  Offer applied · ₹0 due
                </span>
              </div>
            </div>
          </section>
        ) : summary.bankConfigured ? (
          <section className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-card to-card p-5 shadow-sm sm:p-6 dark:border-indigo-500/20 dark:from-indigo-500/10">
            <div className="absolute -right-12 -top-12 size-44 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <SectionHeading
                icon={Landmark}
                tone="indigo"
                title="Pay by bank transfer (NEFT)"
                description="Transfer your monthly fee using the bank details below."
              />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200/70 bg-white/80 p-4 shadow-sm dark:border-indigo-500/20 dark:bg-white/5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount due · {formatMonth(summary.dueMonth)}
                  </p>
                  <p className="font-heading mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                    {formatINR(summary.dueAmount)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Landmark className="size-3.5" />
                  Online · NEFT
                </span>
              </div>

              <dl className="mt-4 grid gap-4 rounded-xl border border-border bg-muted/50 p-5 text-sm text-foreground sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account holder</dt>
                  <dd className="mt-1 font-medium break-words">{summary.bank.accountHolder}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account number</dt>
                  <dd className="mt-1 font-mono font-medium break-all">{summary.bank.accountNumber}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">IFSC code</dt>
                  <dd className="mt-1 font-mono font-medium break-all">{summary.bank.ifsc}</dd>
                </div>
              </dl>

              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                Make sure to enter the correct details while making the payment.
              </p>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
            Online fee payment details are not set up yet. Please pay during opening hours or contact
            the library for online payment options.
          </section>
        )}

        {!summary.feeIsZero && (
          <PaymentConfirmation
            memberId={member.memberId}
            name={member.name}
            month={summary.dueMonth}
            amount={summary.dueAmount}
          />
        )}

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              <Receipt className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">Done a transfer?</p>
              <p className="text-xs text-muted-foreground">Confirm it on WhatsApp, then find the receipt in your history.</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href={`/pay/${token}/payments/history`}>
              Open history
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </section>
      </div>
      </div>
    </PortalShell>
  );
}
