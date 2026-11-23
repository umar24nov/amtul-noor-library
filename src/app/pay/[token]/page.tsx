import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Landmark,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { MemberStatusBadge, PaymentModeText, PaymentStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { SITE_NAV } from "@/lib/site-nav";
import {
  LIBRARY_EMAIL_URL,
  LIBRARY_HOURS,
  LIBRARY_HOURS_DAYS,
  LIBRARY_PHONE_URL,
} from "@/lib/constants";
import {
  currentMonthKey,
  formatDate,
  formatINR,
  formatMonth,
  normalizeSeatNumber,
  shiftMonthKey,
} from "@/lib/format";
import { getMemberLinkAccess, destroyMemberLinkAccess } from "@/lib/member-link-auth";
import { canAny, getSession } from "@/lib/permissions";
import { HERO_PHOTO } from "@/lib/photos";
import { prisma } from "@/lib/prisma";
import { effectiveMemberFee, getMemberFee, getMonthlyFee } from "@/lib/settings";
import { bankDetailsConfigured, getBankDetails } from "@/lib/upi";
import { whatsappChatUrl } from "@/lib/whatsapp";
import { MemberDetailsEditor } from "./member-details";
import { MemberEmailChange } from "./member-email-change";
import { MemberLinkGate } from "./member-link-gate";
import { PaymentConfirmation } from "./payment-confirmation";

export const metadata: Metadata = {
  title: "Your member page",
  robots: { index: false, follow: false },
};

/** Shared accent tiles, so every card speaks the same colour language. */
const tones = {
  indigo:
    "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",
  emerald:
    "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  amber:
    "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
} as const;

type Tone = keyof typeof tones;

function Accent({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone; size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl ring-1",
        size === "lg" ? "size-11" : "size-9",
        tones[tone],
      )}
      aria-hidden="true"
    >
      <Icon className={size === "lg" ? "size-5" : "size-4"} />
    </span>
  );
}

function SectionHeading({
  icon,
  tone,
  title,
  description,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Accent icon={icon} tone={tone} size="lg" />
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-950/5">
      <div className="flex items-center justify-between gap-2">
        <Accent icon={icon} tone={tone} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="font-heading mt-4 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function PayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * The member's permanent, private portal.
 *
 * The token is unguessable, but it is still a bearer link: anybody who sees it
 * could read the details. A visitor must therefore enter a one-time code sent
 * to the email saved on the member record, unless they are signed in as staff.
 * Verification issues a short-lived cookie for this member only, so the same
 * link works normally for the rest of that session.
 *
 * Once inside, a member sees their details, payment history and receipts, can
 * correct their own personal details, confirm a new email, and contact the
 * library. Seat, fee, joining date, status and internal remarks stay staff-only.
 */
export default async function MemberPayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{24,64}$/.test(token)) notFound();

  const member = await prisma.member.findUnique({
    where: { payToken: token },
    include: {
      seat: true,
      payments: { orderBy: [{ month: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!member) notFound();

  const [session, access] = await Promise.all([getSession(), getMemberLinkAccess()]);
  const staffAllowed = Boolean(
    session && canAny(session, ["MEMBERS", "PAYMENTS", "PAYMENTS_VIEW"]),
  );
  const memberAllowed = access?.payToken === token && access.memberId === member.id;

  if (!staffAllowed && !memberAllowed) {
    return (
      <PayLayout>
        <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
          <MemberLinkGate payToken={token} email={member.email} />
        </section>
      </PayLayout>
    );
  }

  async function signOutAction() {
    "use server";
    await destroyMemberLinkAccess();
    redirect(`/pay/${token}`);
  }

  const [standardFee, memberFee] = await Promise.all([
    getMonthlyFee(),
    getMemberFee(member.id),
  ]);
  const monthlyFee = effectiveMemberFee(memberFee, standardFee);

  const soonestPending = [...member.payments]
    .filter((payment) => payment.status === "PENDING")
    .sort((a, b) => a.month.localeCompare(b.month))[0];
  const dueMonth = soonestPending?.month ?? shiftMonthKey(currentMonthKey(), 1);
  // Always the member's own fee, so this page can never quote a stale amount
  // that a pending row was generated with before the fee was last changed.
  const dueAmount = monthlyFee;
  const feeIsZero = monthlyFee <= 0;

  const receiptCount = member.payments.filter(
    (payment) => payment.status === "PAID" && payment.receiptToken,
  ).length;
  const pendingCount = member.payments.filter((payment) => payment.status === "PENDING").length;

  const bankConfigured = bankDetailsConfigured();
  const bank = getBankDetails();

  const seatLabel = member.seat
    ? `${normalizeSeatNumber(member.seat.seatNumber)}${member.seat.hasLocker ? " · locker" : ""}`
    : "—";

  const supportUrl = whatsappChatUrl(
    `Hi, I am ${member.name} (${member.memberId}). I need help with my library membership.`,
  );

  // Remount the self-service forms whenever the record changes, so a saved
  // edit closes the form and shows the fresh values.
  const recordKey = member.updatedAt.toISOString();

  return (
    <PayLayout>
      <section className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
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
            <div className="flex flex-wrap items-start justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-md">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                MEMBER PORTAL · {member.memberId}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {!staffAllowed && (
                  <form action={signOutAction}>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 border-white/20 bg-white/10 text-white shadow-none hover:bg-white/20"
                    >
                      Sign out
                    </Button>
                  </form>
                )}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 border border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Link href="/">
                    <ArrowLeft className="size-3.5" />
                    Back to library
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-emerald-300">Welcome back</p>
                <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {member.name}
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
                  Your membership, payments and receipts — all in one place. Use this same
                  link every month.
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

        {/* ── At-a-glance numbers ──────────────────────────────────────── */}
        <dl className="relative z-10 mx-1 grid grid-cols-2 gap-3 sm:mx-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={Wallet}
            tone="indigo"
            label="Monthly fee"
            value={formatINR(monthlyFee)}
            hint={feeIsZero ? "Free under an offer" : "Your current plan"}
          />
          <StatCard
            icon={CheckCircle2}
            tone="emerald"
            label="Paid months"
            value={String(receiptCount)}
            hint={receiptCount ? "Receipts ready to download" : "No receipts yet"}
          />
          <StatCard
            icon={Clock}
            tone="amber"
            label="Pending"
            value={feeIsZero ? "—" : String(pendingCount)}
            hint={feeIsZero ? "Nothing to pay" : pendingCount ? "Months to settle" : "All clear"}
          />
          <StatCard
            icon={CalendarDays}
            tone="sky"
            label="Next due"
            value={feeIsZero ? "—" : formatMonth(dueMonth)}
            hint={feeIsZero ? "No upcoming fee" : "Upcoming billing month"}
          />
        </dl>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
          <div className="grid gap-6">
            {/* Details */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
              <SectionHeading
                icon={UserRound}
                tone="indigo"
                title="Your details"
                description={
                  memberAllowed
                    ? "Spot a mistake? You can correct your name and contact numbers yourself."
                    : "You're viewing as staff. Edit this member from the admin Members screen."
                }
              />

              <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
                <Detail label="Member ID" value={member.memberId} />
                <Detail label="Full name" value={member.name} />
                <Detail label="Mobile" value={member.mobile ?? "—"} />
                <Detail label="Guardian" value={member.guardianName ?? "—"} />
                <Detail label="Guardian mobile" value={member.guardianMobile ?? "—"} />
                <Detail label="Seat" value={seatLabel} />
                <Detail label="Monthly fee" value={<span className="tabular-nums">{formatINR(monthlyFee)}</span>} />
                <Detail label="Joined" value={formatDate(member.joiningDate)} />
                <Detail label="Status" value={<MemberStatusBadge status={member.status} />} />
                <Detail label="Payment link" value={<span className="text-xs text-muted-foreground">Private · yours only</span>} />
              </dl>

              {memberAllowed && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-border pt-5">
                  <MemberDetailsEditor
                    key={recordKey}
                    payToken={token}
                    details={{
                      name: member.name,
                      mobile: member.mobile,
                      guardianName: member.guardianName,
                      guardianMobile: member.guardianMobile,
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Seat, fee and joining date are managed by the library.
                  </p>
                </div>
              )}
            </section>

            {/* Pay / free */}
            {feeIsZero ? (
              <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-card to-card p-6 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10">
                <div
                  className="absolute -right-12 -top-12 size-40 rounded-full bg-emerald-500/10 blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                    <Sparkles className="size-6" />
                  </span>
                  <div>
                    <h2 className="font-heading text-lg font-semibold tracking-tight">
                      Nothing to pay right now
                    </h2>
                    <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                      Your membership is free under an offer — there is no fee to transfer.
                      Enjoy the library!
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                      <CheckCircle2 className="size-3.5" />
                      Offer applied · ₹0 due
                    </span>
                  </div>
                </div>
              </section>
            ) : bankConfigured ? (
              <section className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/80 via-card to-card p-5 shadow-sm sm:p-6 dark:border-indigo-500/20 dark:from-indigo-500/10">
                <div
                  className="absolute -right-12 -top-12 size-44 rounded-full bg-indigo-500/10 blur-3xl"
                  aria-hidden="true"
                />
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
                        Amount due · {formatMonth(dueMonth)}
                      </p>
                      <p className="font-heading mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                        {formatINR(dueAmount)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <Landmark className="size-3.5" />
                      Online · NEFT
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-4 rounded-xl bg-slate-950 p-5 text-sm text-white sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        Account holder
                      </dt>
                      <dd className="mt-1 font-medium break-words">{bank.accountHolder}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        Account number
                      </dt>
                      <dd className="mt-1 font-mono font-medium break-all">{bank.accountNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        IFSC code
                      </dt>
                      <dd className="mt-1 font-mono font-medium break-all">{bank.ifsc}</dd>
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
                Online fee payment details are not set up yet. Please pay during opening hours
                or at the library.
              </section>
            )}

            {!feeIsZero && (
              <PaymentConfirmation
                memberId={member.memberId}
                name={member.name}
                month={dueMonth}
                amount={dueAmount}
              />
            )}

            {/* Payment history */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading
                  icon={Receipt}
                  tone="emerald"
                  title="Payment history"
                  description="Every month on your record. Paid months have a downloadable receipt."
                />
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {member.payments.length} {member.payments.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {member.payments.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                  <Receipt className="mx-auto size-8 text-muted-foreground/50" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">No payments recorded yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paid months and their receipts will appear here.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 space-y-2.5">
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
                            {formatINR(payment.amount)} ·{" "}
                            <PaymentModeText mode={payment.paymentMode} /> ·{" "}
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

          <div className="grid gap-6">
            {/* Email */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
              <SectionHeading
                icon={Mail}
                tone="sky"
                title="Your email"
                description="Sign-in codes for this page are sent here."
              />

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
                <Accent icon={Mail} tone="sky" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Current address
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium" title={member.email ?? undefined}>
                    {member.email ?? "No email saved yet"}
                  </p>
                </div>
              </div>

              {memberAllowed ? (
                <div className="mt-4">
                  <MemberEmailChange key={recordKey} payToken={token} />
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Change this member&apos;s email from the admin Members screen.
                </p>
              )}
            </section>

            {/* Contact */}
            <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-card to-card p-5 shadow-sm sm:p-6 dark:border-emerald-500/20 dark:from-emerald-500/10">
              <div
                className="absolute -bottom-12 -right-12 size-40 rounded-full bg-emerald-500/10 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">
                <SectionHeading
                  icon={LifeBuoy}
                  tone="emerald"
                  title="Need a hand?"
                  description="Something wrong, or need a hand? Talk to the library owner directly."
                />

                <div className="mt-5 grid gap-2.5">
                  <Button asChild className="h-11 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                    <a href={supportUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-4" />
                      Chat on WhatsApp
                      <ArrowUpRight className="ml-auto size-4" />
                    </a>
                  </Button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button asChild variant="outline" className="h-10">
                      <a href={LIBRARY_PHONE_URL}>
                        <Phone className="size-4" />
                        Call
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-10">
                      <a href={LIBRARY_EMAIL_URL}>
                        <Mail className="size-4" />
                        Email
                      </a>
                    </Button>
                  </div>
                  <Button asChild variant="ghost" className="mt-1 justify-start text-muted-foreground">
                    <Link href="/support">
                      Visit help &amp; support
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                </div>

                <p className="mt-4 flex items-center gap-2 border-t border-emerald-500/15 pt-4 text-xs text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  {LIBRARY_HOURS_DAYS} · {LIBRARY_HOURS}
                </p>
              </div>
            </section>

            {/* Privacy note */}
            <section className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
              <Accent icon={ShieldCheck} tone="indigo" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Your privacy matters.</span> This
                page opens only after a code is emailed to you. Nothing here is shared publicly,
                and no identity documents are ever shown.
              </p>
            </section>
          </div>
        </div>
      </section>
    </PayLayout>
  );
}