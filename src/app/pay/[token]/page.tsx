import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Landmark,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { MemberStatusBadge, PaymentModeText, PaymentStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAV } from "@/lib/site-nav";
import {
  LIBRARY_EMAIL_URL,
  LIBRARY_NAME,
  LIBRARY_PHONE,
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

function PayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />

      <main id="main" className="flex-1">
        {children}
      </main>
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
        <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
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
      <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <FileText className="size-3.5" aria-hidden="true" />
              Member · {member.memberId}
            </p>
            <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight">
              Your member page
            </h1>
            <p className="mt-2 max-w-prose text-muted-foreground">
              {member.name}, this is your personal page — your details, payments and
              receipts, all in one place. Use the same link every month.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!staffAllowed && (
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="sm" className="-mx-2 text-xs">
                  Sign out
                </Button>
              </form>
            )}
            <Link
              href="/"
              className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to {LIBRARY_NAME}
            </Link>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
            <CardDescription>
              {memberAllowed
                ? "Spot a mistake? You can correct your name and contact numbers yourself."
                : "You're viewing as staff. Edit this member from the admin Members screen."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
              <dt className="text-muted-foreground">Member ID</dt>
              <dd className="font-medium">{member.memberId}</dd>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{member.name}</dd>
              <dt className="text-muted-foreground">Mobile</dt>
              <dd className="font-medium">{member.mobile ?? "—"}</dd>
              <dt className="text-muted-foreground">Guardian</dt>
              <dd className="font-medium">{member.guardianName ?? "—"}</dd>
              <dt className="text-muted-foreground">Guardian mobile</dt>
              <dd className="font-medium">{member.guardianMobile ?? "—"}</dd>
              <dt className="text-muted-foreground">Seat</dt>
              <dd className="font-medium">{seatLabel}</dd>
              <dt className="text-muted-foreground">Monthly fee</dt>
              <dd className="font-medium tabular-nums">{formatINR(monthlyFee)}</dd>
              <dt className="text-muted-foreground">Joined</dt>
              <dd className="font-medium">{formatDate(member.joiningDate)}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <MemberStatusBadge status={member.status} />
              </dd>
            </dl>

            {memberAllowed && (
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
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4" />
              Your email
            </CardTitle>
            <CardDescription>
              Sign-in codes for this page are sent to this address.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium break-all">
              {member.email ?? "No email saved yet"}
            </p>

            {memberAllowed ? (
              <MemberEmailChange key={recordKey} payToken={token} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Change this member&apos;s email from the admin Members screen.
              </p>
            )}
          </CardContent>
        </Card>

        {feeIsZero ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">No fee due right now</CardTitle>
              <CardDescription>
                Your membership is currently free under an offer — there is nothing to pay.
                Enjoy the library!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : bankConfigured ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Landmark className="size-4" />
                Pay by bank transfer (NEFT)
              </CardTitle>
              <CardDescription>
                For online payment of your library fee for{" "}
                <strong className="text-foreground">{formatMonth(dueMonth)}</strong> (
                <strong className="tabular-nums text-foreground">{formatINR(dueAmount)}</strong>
                ), please use the following bank details. Make sure to enter the
                correct details while making the payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
                <dt className="text-muted-foreground">Account holder name</dt>
                <dd className="font-medium break-all">{bank.accountHolder}</dd>
                <dt className="text-muted-foreground">Account number</dt>
                <dd className="font-mono font-medium break-all">{bank.accountNumber}</dd>
                <dt className="text-muted-foreground">IFSC code</dt>
                <dd className="font-mono font-medium break-all">{bank.ifsc}</dd>
              </dl>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Online fee payment details are not set up yet. Please pay during opening
            hours or at the library.
          </div>
        )}

        {!feeIsZero && (
          <PaymentConfirmation
            memberId={member.memberId}
            name={member.name}
            month={dueMonth}
            amount={dueAmount}
          />
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Payment history &amp; receipts</CardTitle>
            <CardDescription>
              Every month on your record. Paid months can be downloaded as receipts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {member.payments.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {member.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {formatMonth(payment.month)}
                        <PaymentStatusBadge status={payment.status} />
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatINR(payment.amount)} ·{" "}
                        <PaymentModeText mode={payment.paymentMode} /> ·{" "}
                        {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    {payment.status === "PAID" && payment.receiptToken ? (
                      <Button asChild variant="outline" size="sm">
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
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LifeBuoy className="size-4" />
              Contact support
            </CardTitle>
            <CardDescription>
              Something wrong, or need a hand? Talk to the library owner directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={supportUrl} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp us
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={LIBRARY_PHONE_URL}>
                <Phone className="size-4" />
                Call {LIBRARY_PHONE}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={LIBRARY_EMAIL_URL}>
                <Mail className="size-4" />
                Email us
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/support">Help &amp; support</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </PayLayout>
  );
}