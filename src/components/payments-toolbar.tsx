"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  autoOpenMemberId,
}: {
  members: MemberOption[];
  fee: number;
  /** Member id pulled from the `record` query param; opens the dialog for them. */
  autoOpenMemberId?: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [recordOpen, setRecordOpen] = useState(autoOpenMemberId != null);
  const [preselectedMemberId, setPreselectedMemberId] = useState<number | null>(
    autoOpenMemberId ?? null,
  );

  const clearRecordParams = useCallback(() => {
    const hasRecord = searchParams.get("record");
    const tab = searchParams.get("tab");
    if (!hasRecord && tab !== "record") return;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("record");
    next.delete("tab");
    // When opened via ?memberId=<numeric>&tab=record, that memberId was the
    // record target. A non-numeric memberId (e.g. ATN001) is a list filter and
    // is kept, mirroring how the page parses the params.
    if (tab === "record" && /^\d+$/.test(searchParams.get("memberId") ?? "")) {
      next.delete("memberId");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  // Every close path (overlay click, X, Escape, successful save) clears the
  // preselection and removes record-open URL params, so a refresh won't reopen
  // the dialog after the payment is recorded.
  const setOpen = (open: boolean) => {
    setRecordOpen(open);
    if (!open) {
      setPreselectedMemberId(null);
      clearRecordParams();
    }
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
          defaults={preselectedMemberId != null ? { memberId: preselectedMemberId } : undefined}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
