"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentForm, type MemberOption } from "@/components/payment-form";
import { toInputDate, type MonthOption } from "@/lib/format";
import { updatePaymentAction } from "@/app/(app)/payments/actions";
import type { Payment } from "@/generated/prisma/client";

export function PaymentEditDialog({
  payment,
  member,
  members,
  fee,
  months,
  compact = false,
}: {
  payment: Omit<Payment, "amount"> & { amount: string };
  member: { name: string; memberId: string; mobile: string | null; seatLabel: string | null };
  members: MemberOption[];
  fee: number;
  /** Months offered when moving a payment to a different month. */
  months?: MonthOption[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={compact ? "sm" : "icon"} className={compact ? "h-10" : "size-9"}>
          <Pencil className="size-3.5" />
          {!compact && <span className="sr-only">Edit payment</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit payment</DialogTitle>
          <DialogDescription>
            {payment.paymentId} · {member.name} ({member.memberId})
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          action={updatePaymentAction}
          members={members}
          months={months}
          defaultFee={fee}
          submitLabel="Save changes"
          onSuccess={() => setOpen(false)}
          defaults={{
            recordId: payment.id,
            memberId: payment.memberId,
            month: payment.month,
            amount: payment.amount,
            paymentMode: payment.paymentMode,
            paymentDate: toInputDate(payment.paymentDate),
            status: payment.status,
            remarks: payment.remarks ?? undefined,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}