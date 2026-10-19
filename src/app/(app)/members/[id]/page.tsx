import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, User, CalendarDays, Armchair, Info, Mail } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PaymentStatusBadge, MemberStatusBadge } from "@/components/status-badges";
import { MemberActions } from "@/components/member-actions";
import { ReceiptActions } from "@/components/receipt-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  currentMonthKey,
  formatDate,
  formatINR,
  formatMonth,
  shiftMonthKey,
} from "@/lib/format";
import { toNumber } from "@/lib/ids";
import { effectiveMemberFee, getMemberFee, getMonthlyFee } from "@/lib/settings";
import { siteOrigin } from "@/lib/site";
import { paymentModeLabels } from "@/lib/constants";
import { paymentReceiptUrl } from "@/lib/whatsapp";
import { UpiPayCard } from "@/components/upi-pay-card";
import { getMemberDetail, listOpenSeats } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const member = await getMemberDetail(Number(id));
  return { title: member ? member.name : "Member" };
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value}</dd>
    </div>
  );
}

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ joined?: string; email?: string }>;
}) {
  const { id } = await params;
  const { joined, email } = await searchParams;
  const memberId = Number(id);
  if (!Number.isInteger(memberId)) notFound();

  const member = await getMemberDetail(memberId);
  if (!member) notFound();

  const [openSeats, standardFee, memberFee] = await Promise.all([
    listOpenSeats(member.seatId ?? undefined),
    getMonthlyFee(),
    getMemberFee(member.id),
  ]);
  const monthlyFee = effectiveMemberFee(memberFee, standardFee);
  const origin = await siteOrigin();
  const memberPayUrl = member.payToken ? `${origin}/pay/${member.payToken}` : null;

  const totalPaid = member.payments
    .filter((payment) => payment.status === "PAID")
    .reduce((total, payment) => total + toNumber(payment.amount), 0);
  const paidMonths = member.payments.filter((payment) => payment.status === "PAID").length;
  const pendingMonths = member.payments.filter((payment) => payment.status === "PENDING").length;

  // The oldest month still owed, so the UPI tile asks for the fee that is due
  // first rather than a random one; when nothing is pending the next month leads.
  const soonestPending = [...member.payments]
    .filter((payment) => payment.status === "PENDING")
    .sort((a, b) => a.month.localeCompare(b.month))[0];
  const dueMonth = soonestPending?.month ?? shiftMonthKey(currentMonthKey(), 1);
  const dueAmount =
    soonestPending && toNumber(soonestPending.amount) > 0
      ? toNumber(soonestPending.amount)
      : monthlyFee;

  /** Public link to download a payment's receipt without a login, when it exists. */
  const receiptPublicUrl = (payment: (typeof member.payments)[number]): string | null =>
    payment.status === "PAID" && payment.receiptToken
      ? `${origin}/receipts/${payment.receiptToken}`
      : null;

  /** The WhatsApp receipt link for a paid month, or null when it does not apply. */
  const receiptHref = (payment: (typeof member.payments)[number]): string | null => {
    if (payment.status !== "PAID" || !member.mobile) return null;
    return paymentReceiptUrl(
      member.mobile,
      {
        name: member.name,
        memberId: member.memberId,
        paymentId: payment.paymentId,
        month: payment.month,
        amount: toNumber(payment.amount),
        mode: paymentModeLabels[payment.paymentMode],
        date: payment.paymentDate,
      },
      receiptPublicUrl(payment),
    );
  };

  const seats = openSeats.map((seat) => ({
    id: seat.id,
    label: `${seat.room.name} · Seat ${seat.seatNumber}`,
  }));
  if (member.seat) {
    seats.push({
      id: member.seat.id,
      label: `${member.seat.room ? `${member.seat.room.name} · ` : ""}Seat ${member.seat.seatNumber}`,
    });
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        title={member.name}
        description={`${member.memberId} · ${member.mobile}`}
        actions={
          <MemberActions
            member={{
              id: member.id,
              memberId: member.memberId,
              name: member.name,
              mobile: member.mobile,
              email: member.email,
              guardianName: member.guardianName,
              guardianMobile: member.guardianMobile,
              joiningDate: member.joiningDate.toISOString().slice(0, 10),
              remarks: member.remarks ?? undefined,
              seatId: member.seatId,
              status: member.status,
            }}
            seats={seats}
            seatLabel={
              member.seat
                ? `${member.seat.room ? `${member.seat.room.name} · ` : ""}Seat ${member.seat.seatNumber}`
                : null
            }
            defaultFee={monthlyFee}
          />
        }
      />

      {joined && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
          {member.name} has been added as {member.memberId}
          {member.seat ? ` and assigned to seat ${member.seat.seatNumber}` : ""}.
        </p>
      )}

      {joined && email === "failed" && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          The welcome email could not be sent. Open the application and use{" "}
          <span className="font-medium">Send welcome email</span> to try again.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardContent className="text-sm">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Total paid</p>
            <p className="font-heading mt-1 text-xl font-semibold tabular-nums">
              {formatINR(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="text-sm">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Months paid</p>
            <p className="font-heading mt-1 text-xl font-semibold tabular-nums">{paidMonths}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="text-sm">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Pending months</p>
            <p className="font-heading mt-1 text-xl font-semibold tabular-nums">{pendingMonths}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="text-sm">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Status</p>
            <div className="mt-1.5">
              <MemberStatusBadge status={member.status} />
            </div>
          </CardContent>
        </Card>
      </div>

      <UpiPayCard
        amount={dueAmount}
        month={dueMonth}
        memberId={member.memberId}
        memberPayUrl={memberPayUrl}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="size-4" />
            Personal information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Member ID" value={<span className="font-mono">{member.memberId}</span>} />
            <Detail
              label="Mobile"
              value={
                <a
                  href={`tel:${member.mobile}`}
                  className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
                >
                  <Phone className="size-3.5" />
                  {member.mobile}
                </a>
              }
            />
            <Detail label="Guardian name" value={member.guardianName || "—"} />
            <Detail
              label="Email"
              value={
                member.email ? (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {member.email}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Detail
              label="Guardian mobile"
              value={
                member.guardianMobile ? (
                  <a
                    href={`tel:${member.guardianMobile}`}
                    className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
                  >
                    <Phone className="size-3.5" />
                    {member.guardianMobile}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Detail
              label="Date of joining"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {formatDate(member.joiningDate)}
                </span>
              }
            />
            <Detail
              label="Monthly fee"
              value={
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  {formatINR(monthlyFee)}
                  {memberFee === null && (
                    <span className="text-xs font-normal text-muted-foreground">(standard)</span>
                  )}
                </span>
              }
            />
            <Detail label="Leaving date" value={formatDate(member.leavingDate)} />
            <Detail
              label="Seat"
              value={
                member.seat ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Armchair className="size-3.5" />
                    {member.seat.room ? `${member.seat.room.name} · ` : ""}
                    Seat {member.seat.seatNumber}
                  </span>
                ) : (
                  "No seat"
                )
              }
            />
            <Detail label="Remarks" value={member.remarks || "—"} />
            <Detail
              label="Record created"
              value={formatDate(member.createdAt)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {member.payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <>
              {/* Table on larger screens */}
              <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2 font-medium">Payment ID</th>
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Mode</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Receipt</th>
                      <th className="px-3 py-2 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {member.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-3 py-2 font-mono text-xs">{payment.paymentId}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatMonth(payment.month)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatINR(payment.amount)}
                        </td>
                        <td className="px-3 py-2 capitalize">
                          {payment.paymentMode === "OFFER"
                            ? "Offer"
                            : payment.paymentMode.toLowerCase()}
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-3 py-2">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-3 py-2">
                          {payment.status === "PAID" ? (
                            <ReceiptActions
                              paymentPk={payment.id}
                              whatsappHref={receiptHref(payment)}
                              hasEmail={Boolean(member.email)}
                              publicUrl={receiptPublicUrl(payment)}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="max-w-48 truncate px-3 py-2 text-muted-foreground">
                          {payment.remarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards on phones */}
              <ul className="grid gap-2 sm:hidden">
                {member.payments.map((payment) => (
                  <li key={payment.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{formatMonth(payment.month)}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {payment.paymentId}
                        </p>
                      </div>
                      <PaymentStatusBadge status={payment.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="tabular-nums">{formatINR(payment.amount)}</span>
                      <span className="text-muted-foreground capitalize">
                        {payment.paymentMode === "OFFER"
                          ? "Offer"
                          : payment.paymentMode.toLowerCase()}{" "}
                        · {formatDate(payment.paymentDate)}
                      </span>
                    </div>
                    {payment.remarks && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{payment.remarks}</p>
                    )}
                    {payment.status === "PAID" && (
                      <div className="mt-2">
                        <ReceiptActions
                          paymentPk={payment.id}
                          whatsappHref={receiptHref(payment)}
                          hasEmail={Boolean(member.email)}
                          publicUrl={receiptPublicUrl(payment)}
                          compact
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          <p>
            Member records are never deleted. Payments recorded here stay available even after the
            member leaves.
          </p>
          <Button asChild variant="ghost" size="sm" className="ml-auto h-9">
            <Link href="/members">
              <ArrowLeft className="size-3.5" />
              Back to all members
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}