import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  LifeBuoy,
  Mail,
  MessageCircle,
  Receipt,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "@/components/status-badges";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { HERO_PHOTO } from "@/lib/photos";
import { getFeeSummary, getSeatLabel, getSupportUrl, loadMemberFull } from "./portal-data";
import { PortalTile, StatCard } from "./portal-ui";

export const metadata: Metadata = {
  title: "Your member home",
};

/** The member's private landing page: a clear welcome and routes to every section. */
export default async function MemberHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await loadMemberFull(token);
  const summary = await getFeeSummary(member);
  const seatLabel = getSeatLabel(member);
  const supportUrl = getSupportUrl(member);
  const recent = member.payments.slice(0, 3);

  const tiles = [
    {
      href: `/pay/${token}/details`,
      icon: UserRound,
      tone: "indigo" as const,
      title: "My details",
      description: "Check your record and correct your name or contact numbers.",
      meta: "Personal information",
    },
    {
      href: `/pay/${token}/payments`,
      icon: CreditCard,
      tone: "sky" as const,
      title: "Payments",
      description: "See what is due and how to transfer your monthly fee.",
      meta: "Fees & NEFT",
    },
    {
      href: `/pay/${token}/payments/history`,
      icon: Receipt,
      tone: "emerald" as const,
      title: "Payment history",
      description: "Look back at every month and download your receipts.",
      meta: `${member.payments.length} ${member.payments.length === 1 ? "entry" : "entries"}`,
    },
    {
      href: `/pay/${token}/email`,
      icon: Mail,
      tone: "rose" as const,
      title: "Email & sign-in",
      description: "See where your codes go and move them to a new address.",
      meta: "Account access",
    },
    {
      href: `/pay/${token}/support`,
      icon: LifeBuoy,
      tone: "amber" as const,
      title: "Help & support",
      description: "Talk to the library on WhatsApp, phone or email.",
      meta: "We are here to help",
    },
  ];

  return (
    <section className="grid gap-6">
      {/* ── Welcome hero ───────────────────────────────────────────────── */}
      <div className="relative isolate overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 shadow-2xl shadow-slate-950/15">
        <Image
          src={`/images/${HERO_PHOTO.src}`}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
        <div className="relative flex min-h-64 flex-col justify-between gap-8 p-6 text-white sm:min-h-72 sm:p-9">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-md">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            MEMBER HOME · {member.memberId}
          </span>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-emerald-300">Welcome back</p>
              <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {member.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                Your seat, your payments, your details — neatly organised. Choose a section
                below to see the full story.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur-md">
                <UserRound className="size-3.5" />
                Seat {seatLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 backdrop-blur-md">
                <CalendarDays className="size-3.5" />
                Since {formatDate(member.joiningDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── At a glance ────────────────────────────────────────────────── */}
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
          icon={CalendarDays}
          tone="sky"
          label="Next due"
          value={summary.feeIsZero ? "—" : formatMonth(summary.dueMonth)}
          hint={summary.feeIsZero ? "No upcoming fee" : "Upcoming billing month"}
          href={`/pay/${token}/payments`}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] lg:items-start">
        {/* ── Destinations ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card/50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Explore
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold tracking-tight">
                Where would you like to go?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each section has its own page, so there is less to scroll and more room to breathe.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {tiles.map((tile) => (
              <PortalTile key={tile.href} {...tile} />
            ))}
          </div>
        </section>

        <div className="grid gap-6">
          {/* ── Recent activity ────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Recently
                </p>
                <h2 className="font-heading mt-1 text-base font-semibold tracking-tight">
                  Latest payments
                </h2>
              </div>
              <Link
                href={`/pay/${token}/payments/history`}
                className="rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View all
              </Link>
            </div>

            {recent.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {recent.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {formatMonth(payment.month)}
                        <PaymentStatusBadge status={payment.status} />
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {formatINR(payment.amount)}
                      </p>
                    </div>
                    {payment.status === "PAID" && payment.receiptToken && (
                      <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                        <a href={`/receipts/${payment.receiptToken}`} aria-label={`Receipt for ${formatMonth(payment.month)}`}>
                          <Download className="size-3.5" />
                        </a>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Support strip ──────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-card to-card p-5 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10">
            <div className="absolute -bottom-12 -right-12 size-40 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-heading text-base font-semibold tracking-tight">Need a hand?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Questions about a payment or your details? Message the library directly.
              </p>
              <Button asChild className="mt-4 h-10 w-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                <a href={supportUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" />
                  Chat on WhatsApp
                  <ArrowUpRight className="ml-auto size-4" />
                </a>
              </Button>
              <Link
                href={`/pay/${token}/support`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                All support options
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <section className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Private by design.</span> This area opens
          only after a code is emailed to you. Nothing here is public, and identity documents are
          never shown.
        </p>
      </section>
    </section>
  );
}
