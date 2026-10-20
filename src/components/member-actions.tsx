"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, ReceiptIndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { MemberForm, type SeatOption } from "@/components/member-form";
import { SubmitButton } from "@/components/submit-button";
import { DeleteMemberButton } from "@/components/delete-member-button";
import { markMemberLeftAction, updateMemberAction } from "@/app/(app)/members/actions";
import { todayInputValue } from "@/lib/format";

export type MemberActionTarget = {
  id: number;
  memberId: string;
  name: string;
  mobile: string | null;
  email?: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  joiningDate: string;
  remarks?: string;
  seatId: number | null;
  status: "ACTIVE" | "LEFT";
};

export function MemberActions({
  member,
  seats,
  seatLabel,
  defaultFee,
}: {
  member: MemberActionTarget;
  seats: SeatOption[];
  seatLabel: string | null;
  defaultFee: number;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <Button asChild variant="outline" size="lg" className="h-11 flex-1 sm:flex-none">
        <Link href="/members">
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>

      <Button asChild variant="outline" size="lg" className="h-11 flex-1 sm:flex-none">
        <a href={`/payments?memberId=${member.id}`}>
          <ReceiptIndianRupee className="size-4" />
          Payment
        </a>
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="lg" className="h-11 flex-1 sm:flex-none">
            <Pencil className="size-4" />
            Edit
          </Button>
        </DialogTrigger>
<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="sticky top-0">
          <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>
              Update the permanent record for {member.name} ({member.memberId}).
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            action={async (prev, formData) => {
              const result = await updateMemberAction(prev, formData);
              if (result.status === "success") {
                setEditOpen(false);
                // Pull the updated record straight away, so the page never shows
                // the old details until the owner reloads it by hand.
                router.refresh();
              }
              return result;
            }}
            showPayment={false}
            submitLabel="Save changes"
            seats={seats}
            defaultFee={defaultFee}
            defaults={{
              memberId: member.memberId,
              name: member.name,
              mobile: member.mobile ?? undefined,
              email: member.email ?? undefined,
              guardianName: member.guardianName ?? undefined,
              guardianMobile: member.guardianMobile ?? undefined,
              // A member who left and is being brought back starts a fresh term,
              // so the field opens on today for them. Saving with a seat marks
              // the months between the old leaving date and this date as away.
              joiningDate: member.status === "LEFT" ? todayInputValue() : member.joiningDate,
              remarks: member.remarks,
              seatId: member.seatId,
            }}
          />
        </DialogContent>
      </Dialog>

      {member.status === "ACTIVE" ? (
        <AlertDialog open={leftOpen} onOpenChange={setLeftOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="lg" className="h-11 flex-1 sm:flex-none">
              Mark as Left
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark {member.name} as Left?</AlertDialogTitle>
              <AlertDialogDescription>
                All personal details and payment history are kept.{" "}
                {seatLabel
                  ? `Seat ${seatLabel.split("·").pop()?.trim()} will be released and become available again.`
                  : "No seat is currently assigned."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form
              action={async (formData) => {
                await markMemberLeftAction(formData);
                setLeftOpen(false);
                router.refresh();
                toast.success(`${member.name} marked as Left.`);
              }}
            >
              <input type="hidden" name="memberId" value={member.id} />
              <div className="grid gap-1.5 py-2">
                <label htmlFor="leavingDate" className="text-sm font-medium">
                  Leaving date
                </label>
                <input
                  id="leavingDate"
                  name="leavingDate"
                  type="date"
                  defaultValue={todayInputValue()}
                  required
                  className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
                <SubmitButton variant="destructive" pendingLabel="Marking…">
                  Yes, mark as Left
                </SubmitButton>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <span className="text-sm text-muted-foreground">This member has left</span>
      )}

      <DeleteMemberButton
        memberId={member.id}
        name={member.name}
        memberIdCode={member.memberId}
      />
    </div>
  );
}