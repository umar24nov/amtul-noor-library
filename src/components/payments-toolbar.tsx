"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import type { MonthOption } from "@/lib/format";
import { recordPaymentAction } from "@/app/(app)/payments/actions";

/**
 * The one frequent action on the Collect tab: record a single payment. The two
 * housekeeping jobs it used to carry (standard fee, generating pending rows)
 * moved to the Settings tab, so this is now a single button.
 */
export function PaymentsToolbar({
  members,
  fee,
  months,
}: {
  members: MemberOption[];
  fee: number;
  /** Months offered by the pickers, derived from the data. */
  months?: MonthOption[];
}) {
  const [recordOpen, setRecordOpen] = useState(false);

  return (
    <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 w-full sm:w-auto">
          <Plus className="size-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="sticky top-0">
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Each payment is saved as its own record. Previous months are never changed.
          </DialogDescription>
        </DialogHeader>
        <PaymentForm
          action={recordPaymentAction}
          members={members}
          defaultFee={fee}
          months={months}
          onSuccess={() => setRecordOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
