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
import { deleteMemberAction } from "@/app/(app)/members/actions";

/**
 * Permanently removes a member and everything attached to them: their payment
 * history is deleted with them, and the seat they held is released and marked
 * available again. "Mark as Left" is the reversible version; this one is not.
 */
export function DeleteMemberButton({
  memberId,
  name,
  memberIdCode,
  compact = false,
}: {
  memberId: number;
  name: string;
  memberIdCode: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const remove = () => {
    startTransition(async () => {
      const result = await deleteMemberAction(memberId);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not delete the member.");
        return;
      }
      toast.success(result.message ?? "Member deleted.");
      setOpen(false);
      // The record is gone, so staying on its page would 404.
      router.push("/members");
      router.refresh();
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "lg"}
          className={compact ? "h-9 text-destructive" : "h-11 text-destructive"}
        >
          <Trash2 className={compact ? "size-3.5" : "size-4"} />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name} permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes {name} ({memberIdCode}) and all of their payment history,
            and releases their seat so it can be given to someone else. This
            cannot be undone. If the member has simply left, use Mark as Left instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-10" disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <Button type="button" variant="destructive" className="h-10" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Yes, delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
