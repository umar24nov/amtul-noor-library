"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { LoadMoreFooter } from "@/components/load-more-footer";
import { PaymentEditDialog } from "@/components/payment-edit-dialog";
import { ReceiptActions } from "@/components/receipt-actions";
import { PaymentStatusBadge } from "@/components/status-badges";
import { STICKY_HEADER_CELL, paymentModeLabels } from "@/lib/constants";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { paymentReceiptUrl } from "@/lib/whatsapp";
import type { Payment } from "@/generated/prisma/client";
import type { MemberWithSeat } from "@/lib/queries";
import { loadMorePaymentsAction } from "@/app/(app)/payments/actions";

/** A payment row with the member it belongs to, seat and room included. */
export type PaymentRow = Payment & { member: MemberWithSeat };

export type PaymentMemberOption = {
  id: number;
  name: string;
  memberId: string;
  mobile: string | null;
  seatLabel: string | null;
};

export type PaymentListQuery = {
  month?: string;
  memberId?: string;
  q?: string;
  mode?: string;
  status?: string;
};

/**
 * Payments table with a header that stays put and a body that grows as you
 * scroll, instead of Next/Previous buttons.
 *
 * No overflow-hidden on the wrapper: it would become a scroll container and the
 * sticky header would stop following the viewport.
 */
export function PaymentsTable({
  payments,
  members,
  fee,
  months,
  total: totalCount,
  query,
  canEdit = true,
}: {
  payments: PaymentRow[];
  members: PaymentMemberOption[];
  fee: number;
  months: { value: string; label: string }[];
  total: number;
  query: PaymentListQuery;
  /** False for a read-only viewer: no edit button, no sending of receipts. */
  canEdit?: boolean;
}) {
  // The page hands over the first batch and remounts this component (via a key)
  // whenever a filter changes, so the accumulated rows start clean each time.
  const [rows, setRows] = useState(payments);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const hasMore = rows.length < total;

  const loadMore = useCallback(async () => {
    if (loading || rows.length >= total) return;
    setLoading(true);
    try {
      const next = await loadMorePaymentsAction({ ...query, page: page + 1 });
      const seen = new Set(rows.map((row) => row.id));
      const fresh = next.payments.filter((row) => !seen.has(row.id));
      if (fresh.length === 0) {
        // The server had nothing new to give, even if its count disagrees.
        // Stop offering "Load more" so the button cannot spin against an empty
        // page — this is what made the spinner seem stuck at the end.
        setTotal(rows.length);
      } else {
        setRows([...rows, ...fresh]);
        setTotal(next.total);
      }
      setPage((current) => current + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, page, query, rows, total]);

  /** A WhatsApp receipt link for a paid record, or null when it does not apply. */
  function receiptHref(payment: PaymentRow) {
    if (payment.status !== "PAID" || !payment.member.mobile) return null;
    return paymentReceiptUrl(payment.member.mobile, {
      name: payment.member.name,
      memberId: payment.member.memberId,
      paymentId: payment.paymentId,
      month: payment.month,
      amount: Number(payment.amount),
      mode: paymentModeLabels[payment.paymentMode],
      date: payment.paymentDate,
    });
  }

  return (
    <>
      <div className="hidden rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className={STICKY_HEADER_CELL}>Payment ID</th>
              <th className={STICKY_HEADER_CELL}>Member</th>
              <th className={STICKY_HEADER_CELL}>Month</th>
              <th className={cn(STICKY_HEADER_CELL, "text-right")}>Amount</th>
              <th className={STICKY_HEADER_CELL}>Mode</th>
              <th className={STICKY_HEADER_CELL}>Date</th>
              <th className={STICKY_HEADER_CELL}>Status</th>
              {canEdit ? (
                <th className={cn(STICKY_HEADER_CELL, "text-right")}>Edit</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((payment) => (
              <tr key={payment.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                  {payment.paymentId}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/members/${payment.member.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {payment.member.name}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {payment.member.memberId}
                  </p>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{formatMonth(payment.month)}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                  {formatINR(payment.amount)}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {paymentModeLabels[payment.paymentMode]}
                </td>
                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                  {formatDate(payment.paymentDate)}
                </td>
                <td className="px-3 py-2.5">
                  <PaymentStatusBadge status={payment.status} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ReceiptActions
                      paymentPk={payment.id}
                      status={payment.status}
                      whatsappHref={receiptHref(payment)}
                      hasEmail={Boolean(payment.member.email)}
                      compact
                      canSendEmail={canEdit}
                    />
                    {canEdit ? (
                      <PaymentEditDialog
                        payment={{ ...payment, amount: String(payment.amount) }}
                        fee={fee}
                        members={members}
                        months={months}
                        member={{
                          name: payment.member.name,
                          memberId: payment.member.memberId,
                          mobile: payment.member.mobile,
                          seatLabel: payment.member.seat
                            ? `${payment.member.seat.room?.name} · Seat ${payment.member.seat.seatNumber}`
                            : null,
                        }}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2 md:hidden">
        {rows.map((payment) => (
          <li key={payment.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/members/${payment.member.id}`}
                  className="block truncate font-medium underline-offset-2 hover:underline"
                >
                  {payment.member.name}
                </Link>
                <p className="font-mono text-xs text-muted-foreground">
                  {payment.paymentId} · {payment.member.memberId}
                </p>
              </div>
              <PaymentStatusBadge status={payment.status} />
            </div>

<div className="mt-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold tabular-nums">
                      {formatINR(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMonth(payment.month)} · {paymentModeLabels[payment.paymentMode]} ·{" "}
                      {formatDate(payment.paymentDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <ReceiptActions
                      paymentPk={payment.id}
                      status={payment.status}
                      whatsappHref={receiptHref(payment)}
                      hasEmail={Boolean(payment.member.email)}
                      compact
                      canSendEmail={canEdit}
                    />
                    {canEdit ? (
                      <PaymentEditDialog
                        payment={{ ...payment, amount: String(payment.amount) }}
                        fee={fee}
                        members={members}
                        months={months}
                        compact
                        member={{
                          name: payment.member.name,
                          memberId: payment.member.memberId,
                          mobile: payment.member.mobile,
                          seatLabel: null,
                        }}
                      />
                    ) : null}
                  </div>
                </div>

            {payment.remarks && (
              <p className="mt-1.5 text-xs text-muted-foreground">{payment.remarks}</p>
            )}
          </li>
        ))}
      </ul>

      <LoadMoreFooter
        loaded={rows.length}
        total={total}
        unit="payment records"
        hasMore={hasMore}
        loading={loading}
        onLoadMore={loadMore}
      />
    </>
  );
}
