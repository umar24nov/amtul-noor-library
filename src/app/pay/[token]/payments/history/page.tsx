import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Download, Receipt } from "lucide-react";
import { PaymentModeText, PaymentStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { loadPortal } from "../../portal-data";
import { PortalGate, PortalShell } from "../../portal-shell";
import { Accent, PageIntro } from "../../portal-ui";

export const metadata: Metadata = {
  title: "Payment history",
};

/** A member's full month-by-month record, with receipts where available. */
export default async function MemberPaymentHistoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed, staffAllowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  const count = member.payments.length;

  return (
    <PortalShell token={token} member={member} staffAllowed={staffAllowed}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
        <PageIntro
        icon={Receipt}
        tone="emerald"
        eyebrow="Records"
        title="Payment history"
        description="Every month on your record. Paid months have a receipt you can download at any time."
        action={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {count} {count === 1 ? "entry" : "entries"}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/pay/${token}/details`}>My details</Link>
            </Button>
          </div>
        }
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        {count === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
            <Receipt className="mx-auto size-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">No payments recorded yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paid months and their receipts will appear here.
            </p>
          </div>
        ) : (
          <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5">
            {member.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <Accent
                    icon={payment.status === "PAID" ? CheckCircle2 : Receipt}
                    tone={payment.status === "PAID" ? "emerald" : "amber"}
                  />
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {formatMonth(payment.month)}
                      <PaymentStatusBadge status={payment.status} />
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {formatINR(payment.amount)} · <PaymentModeText mode={payment.paymentMode} /> ·{" "}
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                </div>
                {payment.status === "PAID" && payment.receiptToken ? (
                  <Button asChild variant="outline" size="sm" className="h-8">
                    <a href={`/receipts/${payment.receiptToken}`}>
                      <Download className="size-3.5" />
                      Receipt
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </PortalShell>
  );
}
