"use client";

import { useState } from "react";
import { ListPlus, Plus, Settings2 } from "lucide-react";
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
import { FeeForm } from "@/components/fee-form";
import { formatINR, monthOptions } from "@/lib/format";
import { generatePendingAction, recordPaymentAction, updateFeeAction } from "@/app/(app)/payments/actions";

export function PaymentsToolbar({
  members,
  fee,
  month,
}: {
  members: MemberOption[];
  fee: number;
  month: string;
}) {
  const [recordOpen, setRecordOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="h-11 w-full sm:w-auto">
            <Plus className="size-4" />
            Record Payment
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Each payment is saved as its own record. Previous months are never changed.
            </DialogDescription>
          </DialogHeader>
          <PaymentForm
            action={recordPaymentAction}
            members={members}
            defaultFee={fee}
            onSuccess={() => setRecordOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={pendingOpen} onOpenChange={setPendingOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="lg" className="h-11 w-full sm:w-auto">
            <ListPlus className="size-4" />
            Mark unpaid as pending
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate pending payments</DialogTitle>
            <DialogDescription>
              Adds one pending record of {formatINR(fee)} for every active member who has no record
              for the chosen month. Members who already paid are left alone.
            </DialogDescription>
          </DialogHeader>
          <PendingGenerator month={month} onDone={() => setPendingOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon-lg" className="size-11" aria-label="Monthly fee">
            <Settings2 className="size-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Standard monthly fee</DialogTitle>
            <DialogDescription>
              Used as the suggested amount and when generating pending payments.
            </DialogDescription>
          </DialogHeader>
          <FeeForm fee={fee} action={updateFeeAction} onDone={() => setFeeOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingGenerator({ month, onDone }: { month: string; onDone: () => void }) {
  const [selected, setSelected] = useState(month);

  return (
    <form
      action={async (formData) => {
        const result = await generatePendingAction({ status: "idle" }, formData);
        if (result.status === "success") {
          onDone();
        } else {
          window.alert(result.message ?? "Could not generate pending payments.");
        }
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="month" value={selected} />
      <div className="grid gap-1.5">
        <label htmlFor="pending-month" className="text-sm font-medium">
          Month
        </label>
        <select
          id="pending-month"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {monthOptions(24, 1).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="lg" className="h-11">
        Generate pending
      </Button>
    </form>
  );
}