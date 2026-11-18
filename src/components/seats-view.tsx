"use client";

import { useState } from "react";
import { KeyRound, Settings2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AssignSeatDialog,
  ConfirmDeleteForm,
  ManageForm,
  SeatDetailsDialog,
  type AssignableMember,
} from "@/components/seat-dialogs";
import {
  addSeatAction,
  addSeatRangeAction,
  assignSeatAction,
  deleteSeatAction,
  releaseSeatAction,
} from "@/app/(app)/seats/actions";
import type { ActionState } from "@/lib/action-result";
import { LIBRARY_FEES } from "@/lib/constants";

export type SeatCardData = {
  id: number;
  seatNumber: string;
  status: "AVAILABLE" | "OCCUPIED";
  hasLocker: boolean;
  occupants: { id: number; name: string; memberId: string; mobile: string | null }[];
};

function SeatCard({
  seat,
  onAssign,
  onOpen,
}: {
  seat: SeatCardData;
  onAssign: () => void;
  onOpen: () => void;
}) {
  const occupied = seat.status === "OCCUPIED";
  const occupant = seat.occupants[0];

  return (
    <button
      type="button"
      onClick={occupied ? onOpen : onAssign}
      className={`group flex min-h-24 w-full flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${
        occupied
          ? "border-warning/40 bg-warning/10 hover:bg-warning/20"
          : "border-border bg-card hover:border-success/40 hover:bg-success/5"
      }`}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="font-heading text-base font-semibold tabular-nums">
          {seat.seatNumber}
        </span>
        <span className="flex items-center gap-1">
          {seat.hasLocker ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
              <KeyRound className="size-3" />
              Locker
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${
              occupied
                ? "bg-warning/25 text-warning-foreground"
                : "bg-success/15 text-success"
            }`}
          >
            {occupied ? "Occupied" : "Available"}
          </span>
        </span>
      </span>
      {/* pr-8 keeps the text clear of the delete button in the corner. */}
      <span className="w-full truncate pr-8 text-sm font-medium">
        {occupied ? (occupant?.name ?? "Unknown") : "Free"}
      </span>
      <span className="w-full truncate pr-8 text-xs text-muted-foreground">
        {occupied ? occupant?.memberId ?? "" : seat.hasLocker ? "With locker" : "Non-locker"}
      </span>
    </button>
  );
}

function DeleteSeatDialog({ seat }: { seat: SeatCardData }) {
  const [open, setOpen] = useState(false);
  const occupied = seat.status === "OCCUPIED";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Delete seat ${seat.seatNumber}`}
          className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete seat {seat.seatNumber}?</DialogTitle>
          <DialogDescription>
            {occupied
              ? "This seat is occupied. Release it before deleting."
              : `Seat ${seat.seatNumber} will be removed. Member records are not affected.`}
          </DialogDescription>
        </DialogHeader>
        <ConfirmDeleteForm action={deleteSeatAction} seatId={seat.id} message="Delete seat" />
      </DialogContent>
    </Dialog>
  );
}

function ManageSeatsDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="h-11 w-full sm:w-auto">
          <Settings2 className="size-4" />
          Manage seats
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage seats</DialogTitle>
          <DialogDescription>
            Add seats to the single numbered list. Seats 1–22 are plain and seats 23–44 have a
            locker; the fee follows the number. A seat can only be deleted while it is free.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <section className="grid gap-3">
            <Label>Add a seat range</Label>
            <ManageForm
              action={addSeatRangeAction}
              submitLabel="Add seat range"
              pendingLabel="Adding…"
              fields={
                <div className="grid grid-cols-2 gap-2">
                  <Input name="from" type="number" min="1" max="44" placeholder="From" className="h-11" required />
                  <Input name="to" type="number" min="1" max="44" placeholder="To" className="h-11" required />
                </div>
              }
            />
          </section>

          <section className="grid gap-3">
            <Label>Add a single seat</Label>
            <ManageForm
              action={addSeatAction}
              submitLabel="Add single seat"
              pendingLabel="Adding…"
              fields={
                <Input name="seatNumber" type="number" min="1" max="44" placeholder="Seat number" className="h-11" required />
              }
            />
          </section>

          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            Fees follow the seat number: non-locker ₹{LIBRARY_FEES.seat}/month, with locker ₹
            {LIBRARY_FEES.seatWithLocker}/month.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SeatsView({
  seats,
  members,
}: {
  seats: SeatCardData[];
  members: AssignableMember[];
}) {
  const [assignSeat, setAssignSeat] = useState<SeatCardData | null>(null);
  const [openSeat, setOpenSeat] = useState<SeatCardData | null>(null);

  const firstFree = seats.find((seat) => seat.status === "AVAILABLE") ?? null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ManageSeatsDialog />

        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full sm:w-auto"
          onClick={() => {
            if (firstFree) setAssignSeat(firstFree);
          }}
          disabled={!firstFree}
        >
          <UserPlus className="size-4" />
          Assign seat
        </Button>
      </div>

      {seats.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No seats yet. Use “Manage seats” to add seat 1.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {seats.map((seat) => (
              <div key={seat.id} className="group relative">
                <SeatCard
                  seat={seat}
                  onAssign={() => setAssignSeat(seat)}
                  onOpen={() => setOpenSeat(seat)}
                />
                {/* Bottom right, so it never sits on top of the status badge.
                    Always visible on touch screens, revealed on hover elsewhere. */}
                <div className="absolute right-1.5 bottom-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <DeleteSeatDialog seat={seat} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {seats.filter((seat) => seat.status === "AVAILABLE").length} available,{" "}
            {seats.filter((seat) => seat.status === "OCCUPIED").length} occupied. Tap a seat to see
            the member or assign someone.
          </p>
        </>
      )}

      {assignSeat && (
        <AssignSeatDialog
          open
          onOpenChange={(open) => {
            if (!open) setAssignSeat(null);
          }}
          seat={{ id: assignSeat.id, label: `Seat ${assignSeat.seatNumber}` }}
          members={members}
          action={assignSeatAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
        />
      )}

      {openSeat && (
        <SeatDetailsDialog
          key={openSeat.id}
          open
          onOpenChange={(open) => {
            if (!open) setOpenSeat(null);
          }}
          seat={{
            id: openSeat.id,
            label: `Seat ${openSeat.seatNumber}`,
            hasLocker: openSeat.hasLocker,
            occupants: openSeat.occupants,
          }}
          releaseAction={releaseSeatAction}
          viewHref={
            openSeat.occupants[0] ? `/members/${openSeat.occupants[0].id}` : undefined
          }
        />
      )}
    </div>
  );
}
