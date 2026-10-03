"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Eye } from "lucide-react";
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
import { MemberStatusBadge } from "@/components/status-badges";
import { formatDate, todayInputValue } from "@/lib/format";
import { markMemberLeftAction, updateMemberAction } from "@/app/(app)/members/actions";
import type { MemberWithSeat } from "@/lib/queries";

export type EditableMember = {
  id: number;
  memberId: string;
  name: string;
  mobile: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  joiningDate: Date;
  remarks: string | null;
  seatId: number | null;
  status: MemberWithSeat["status"];
};

function seatText(member: MemberWithSeat): string {
  if (!member.seat) return "—";
  return `${member.seat.room ? `${member.seat.room.name} · ` : ""}${member.seat.seatNumber}`;
}

function MarkLeftDialog({ member, seat }: { member: EditableMember; seat: string }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto">
          Mark as Left
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {member.name} as Left?</AlertDialogTitle>
          <AlertDialogDescription>
            This keeps all personal details and payment history. {seat !== "—" ? `Seat ${seat} will be released and become available again.` : "No seat is currently assigned."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={async (formData) => {
            await markMemberLeftAction(formData);
            setOpen(false);
            toast.success(`${member.name} marked as Left. Seat released.`);
          }}
        >
          <input type="hidden" name="memberId" value={member.id} />
          <div className="grid gap-1.5 py-2">
            <label htmlFor={`leaving-${member.id}`} className="text-sm font-medium">
              Leaving date
            </label>
            <input
              id={`leaving-${member.id}`}
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
  );
}

function EditDialog({
  member,
  seats,
}: {
  member: EditableMember;
  seats: SeatOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Update the permanent record for {member.name} ({member.memberId}).
          </DialogDescription>
        </DialogHeader>
        <MemberForm
          action={async (prev, formData) => {
            const result = await updateMemberAction(prev, formData);
            if (result.status === "success") setOpen(false);
            return result;
          }}
          showPayment={false}
          submitLabel="Save changes"
          seats={seats}
          defaults={{
            memberId: member.memberId,
            name: member.name,
            mobile: member.mobile ?? undefined,
            guardianName: member.guardianName ?? undefined,
            guardianMobile: member.guardianMobile ?? undefined,
            joiningDate: member.joiningDate.toISOString().slice(0, 10),
            remarks: member.remarks ?? undefined,
            seatId: member.seatId,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function RowActions({
  member,
  seats,
}: {
  member: EditableMember;
  seats: SeatOption[];
}) {
  const seat = seatText(member as MemberWithSeat);

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button asChild variant="outline" size="sm" className="h-9">
        <a href={`/members/${member.id}`}>
          <Eye className="size-3.5" />
          View
        </a>
      </Button>
      <EditDialog member={member} seats={seats} />
      {member.status === "ACTIVE" ? (
        <MarkLeftDialog member={member} seat={seat} />
      ) : (
        <span className="px-2 text-xs text-muted-foreground">No seat</span>
      )}
    </div>
  );
}

export function MemberTable({
  members,
  seats,
}: {
  members: EditableMember[];
  seats: SeatOption[];
}) {
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2.5 font-medium">Member ID</th>
              <th className="px-3 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Mobile</th>
              <th className="px-3 py-2.5 font-medium">Seat</th>
              <th className="px-3 py-2.5 font-medium">Joining date</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                  {member.memberId}
                </td>
                <td className="px-3 py-2.5 font-medium">{member.name}</td>
                <td className="px-3 py-2.5 tabular-nums">{member.mobile}</td>
                <td className="px-3 py-2.5 tabular-nums">{seatText(member as MemberWithSeat)}</td>
                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                  {formatDate(member.joiningDate)}
                </td>
                <td className="px-3 py-2.5">
                  <MemberStatusBadge status={member.status} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <RowActions member={member} seats={seats} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2.5 md:hidden">
        {members.map((member) => (
          <div key={member.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{member.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{member.memberId}</p>
              </div>
              <MemberStatusBadge status={member.status} />
            </div>

            <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Mobile</dt>
                <dd className="tabular-nums">{member.mobile}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Seat</dt>
                <dd className="tabular-nums">{seatText(member as MemberWithSeat)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Joining date</dt>
                <dd className="tabular-nums">{formatDate(member.joiningDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Guardian</dt>
                <dd className="truncate">{member.guardianName || "—"}</dd>
              </div>
            </dl>

            <div className="mt-3 flex gap-2">
              <Button asChild variant="secondary" size="sm" className="h-10 flex-1">
                <a href={`/members/${member.id}`}>View</a>
              </Button>
              <EditDialog member={member} seats={seats} />
            </div>

            {member.status === "ACTIVE" && (
              <div className="mt-2">
                <MarkLeftDialog member={member} seat={seatText(member as MemberWithSeat)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}