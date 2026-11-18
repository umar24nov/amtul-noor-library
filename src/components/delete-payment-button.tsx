"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deletePaymentAction } from "@/app/(app)/payments/actions";

/**
 * Removes one payment row and its receipt link for good. A full-access admin
 * can fix a mistaken amount with Edit; this is for rows that should not exist.
 */
export function DeletePaymentButton({
  recordId,
  paymentLabel,
  monthLabel,
  memberName,
}: {
  recordId: number;
  paymentLabel: string;
  monthLabel: string;
  memberName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    startTransition(async () => {
      const result = await deletePaymentAction(recordId);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not delete the payment.");
        return;
      }
      toast.success(result.message ?? "Payment deleted.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Delete payment ${paymentLabel}`}
          className="h-10 border-destructive/40 px-2.5 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {paymentLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {memberName}&apos;s {monthLabel} payment row.
            Its receipt link will stop working. Use Edit if the amount or status
            just needs correcting.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-10" disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            className="h-10 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={remove}
            disabled={pending}
          >
            {pending ? "Deleting…" : "Yes, delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
