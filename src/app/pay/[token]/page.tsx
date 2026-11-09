import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Landmark, MessageCircle } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAV } from "@/lib/site-nav";
import { LIBRARY_NAME } from "@/lib/constants";
import { currentMonthKey, formatDate, formatINR, formatMonth, shiftMonthKey } from "@/lib/format";
import { effectiveMemberFee, getMemberFee, getMonthlyFee } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { bankDetailsConfigured, getBankDetails } from "@/lib/upi";
import { whatsappChatUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Pay your fee",
  robots: { index: false, follow: false },
};

/**
 * The member's permanent, private payment page.
 *
 * Created once at enrollment and never changes, so the owner shares the same
 * link every month: the member sees the fee due next, bank transfer (NEFT)
 * details to pay it, and download links for paid receipts. No login is needed
 * because the address is an unguessable token; the owner still records the
 * payment in the app, which is what makes the receipt appear here.
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
      payments: { orderBy: [{ month: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!member) notFound();

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

  const paidReceipts = member.payments
    .filter((payment) => payment.status === "PAID" && payment.receiptToken)
    .sort((a, b) => b.month.localeCompare(a.month));

  const bankConfigured = bankDetailsConfigured();
  const bank = getBankDetails();

  const afterPayUrl = bankConfigured
    ? whatsappChatUrl(
        `Hi, I am ${member.memberId}. I just paid my library fee for ${formatMonth(
          dueMonth,
        )} (${formatINR(dueAmount)}) via NEFT/bank transfer.`,
      )
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" aria-hidden="true" />
                Member payment · {member.memberId}
              </p>
              <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight">
                Pay your fee
              </h1>
              <p className="mt-2 max-w-prose text-muted-foreground">
                {member.name}, this is your personal page — use the same link
                every month to pay and to download your receipts.
              </p>
            </div>
            <Link
              href="/"
              className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to {LIBRARY_NAME}
            </Link>
          </div>

          {bankConfigured ? (
            <Card className="mt-8">
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
                {afterPayUrl && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild size="lg" variant="outline">
                      <a href={afterPayUrl} target="_blank" rel="noreferrer">
                        <MessageCircle className="size-4" />
                        I&apos;ve paid — confirm on WhatsApp
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      The receipt appears here once the library records the payment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Online fee payment details are not set up yet. Please pay during opening
              hours or on WhatsApp.
            </div>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Your receipts</CardTitle>
              <CardDescription>
                Paid months, ready to download.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paidReceipts.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No paid receipts yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {paidReceipts.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {formatMonth(payment.month)}
                        </p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatINR(payment.amount)} · {formatDate(payment.paymentDate)}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={`/receipts/${payment.receiptToken}`}>
                          <Download className="size-3.5" />
                          Download
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
