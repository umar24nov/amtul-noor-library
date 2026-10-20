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
 *
 * Arriving with `?record=<member id>` (the "Record payment" button on a member
 * page) opens the dialog straight away with that member already selected, so
 * collecting one person's fee is one click from their page plus Save.
 */
export function PaymentsToolbar({
  members,
  fee,
  months,
  autoOpenMemberId,
}: {
  members: MemberOption[];
  fee: number;
  /** Months offered by the pickers, derived from the data. */
  months?: MonthOption[];
  /** Member id pulled from the `record` query param; opens the dialog for them. */
  autoOpenMemberId?: number | null;
}) {
  const [recordOpen, setRecordOpen] = useState(autoOpenMemberId != null);
  const [preselectedMemberId, setPreselectedMemberId] = useState<number | null>(
    autoOpenMemberId ?? null,
  );

  // Every close path (overlay click, X, Escape, successful save) clears the
  // preselection, so a later manual open starts from a blank form.
  const setOpen = (open: boolean) => {
    setRecordOpen(open);
    if (!open) setPreselectedMemberId(null);
  };

  return (
    <Dialog open={recordOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 w-full sm:w-auto">
          <Plus className="size-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
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
          months={months}
          defaults={preselectedMemberId != null ? { memberId: preselectedMemberId } : undefined}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
