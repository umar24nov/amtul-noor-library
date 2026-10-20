"use client";

import { useState } from "react";
import { Plus, Settings2, Trash2, UserPlus, X } from "lucide-react";
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
  ConfirmDeleteRoomForm,
  ManageForm,
  SeatDetailsDialog,
  type AssignableMember,
} from "@/components/seat-dialogs";
import {
  addRoomAction,
  addSeatAction,
  addSeatRangeAction,
  assignSeatAction,
  deleteRoomAction,
  deleteSeatAction,
  releaseSeatAction,
  updateRoomAction,
} from "@/app/(app)/seats/actions";
import type { ActionState } from "@/lib/action-result";

export type SeatCardData = {
  id: number;
  seatNumber: string;
  status: "AVAILABLE" | "OCCUPIED";
  occupants: { id: number; name: string; memberId: string; mobile: string | null }[];
};

export type RoomData = {
  id: number;
  name: string;
  seats: SeatCardData[];
};

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function SeatCard({
  seat,
  roomName,
  onAssign,
  onOpen,
}: {
  seat: SeatCardData;
  roomName: string;
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
      {/* pr-8 keeps the text clear of the delete button in the corner. */}
      <span className="w-full truncate pr-8 text-sm font-medium">
        {occupied ? (occupant?.name ?? "Unknown") : "Free"}
      </span>
      <span className="w-full truncate pr-8 text-xs text-muted-foreground">
        {occupied ? `${roomName} · ${occupant?.memberId ?? ""}` : roomName}
      </span>
    </button>
  );
}

function DeleteSeatDialog({ seat, roomName }: { seat: SeatCardData; roomName: string }) {
  const [open, setOpen] = useState(false);
  const occupied = seat.status === "OCCUPIED";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete seat ${seat.seatNumber}`}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete seat {seat.seatNumber}?</DialogTitle>
          <DialogDescription>
            {occupied
              ? "This seat is occupied. Release it before deleting."
              : `Seat ${seat.seatNumber} in ${roomName} will be removed. Member records are not affected.`}
          </DialogDescription>
        </DialogHeader>
        <ConfirmDeleteForm action={deleteSeatAction} seatId={seat.id} message="Delete seat" />
      </DialogContent>
    </Dialog>
  );
}

function ManageSeatsDialog({ rooms }: { rooms: RoomData[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="h-11 w-full sm:w-auto">
          <Settings2 className="size-4" />
          Manage seats
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="sticky top-0">
          <DialogTitle>Rooms and seats</DialogTitle>
          <DialogDescription>
            Add, rename or remove rooms and seats as the library changes. Renaming keeps every seat
            and member where it is; deleting a room removes its seats. A seat can only be deleted
            while it is free.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <section className="grid gap-2">
            <Label htmlFor="new-room">Add a room</Label>
            <ManageForm
              action={addRoomAction}
              submitLabel="Add room"
              pendingLabel="Adding…"
              fields={
                <Input
                  id="new-room"
                  name="name"
                  placeholder="e.g. Room 2"
                  className="h-11"
                  required
                />
              }
            />
          </section>

          <section className="grid gap-3">
            <Label>Add seats to a room</Label>
            <ManageForm
              action={addSeatRangeAction}
              submitLabel="Add seat range"
              pendingLabel="Adding…"
              fields={
                <div className="grid gap-2">
                  <select name="roomId" required className={FIELD_CLASS} aria-label="Room">
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input name="from" type="number" min="1" placeholder="From" className="h-11" required />
                    <Input name="to" type="number" min="1" placeholder="To" className="h-11" required />
                  </div>
                </div>
              }
            />

            <ManageForm
              action={addSeatAction}
              submitLabel="Add single seat"
              pendingLabel="Adding…"
              fields={
                <div className="grid gap-2">
                  <select name="roomId" required className={FIELD_CLASS} aria-label="Room">
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                  <Input name="seatNumber" type="number" min="1" placeholder="Seat number" className="h-11" required />
                </div>
              }
            />
          </section>

          {rooms.length > 0 && (
            <section className="grid gap-2">
              <Label>Rename a room</Label>
              {rooms.map((room) => (
                <details key={room.id} className="rounded-lg border border-border p-2">
                  <summary className="cursor-pointer px-1 py-1 text-sm font-medium">
                    {room.name} · {room.seats.length} seats
                  </summary>
                  <div className="mt-2">
                    <ManageForm
                      action={updateRoomAction}
                      submitLabel="Save name"
                      pendingLabel="Saving…"
                      roomId={room.id}
                      fields={
                        <Input
                          name="name"
                          defaultValue={room.name}
                          placeholder={room.name}
                          className="h-11"
                          required
                          maxLength={40}
                          aria-label={`New name for ${room.name}`}
                        />
                      }
                    />
                  </div>
                </details>
              ))}
            </section>
          )}

          {rooms.length > 0 && (
            <section className="grid gap-2">
              <Label>Remove a room</Label>
              <p className="text-xs text-muted-foreground">
                Deleting a room also deletes its{" "}
                {rooms.reduce((sum, room) => sum + room.seats.length, 0)} seats. Any member still
                holding one of those seats keeps their record but loses the seat, and a room with an
                occupied seat cannot be deleted at all. Renaming above is the safe option if only the
                name is wrong.
              </p>
              {rooms.map((room) => (
                <details key={room.id} className="rounded-lg border border-border p-2">
                  <summary className="cursor-pointer px-1 py-1 text-sm font-medium">
                    {room.name} · {room.seats.length} seats
                  </summary>
                  <div className="mt-2">
                    <ConfirmDeleteRoomForm
                      action={deleteRoomAction}
                      roomId={room.id}
                      message={`Delete ${room.name} and its ${room.seats.length} seats`}
                    />
                  </div>
                </details>
              ))}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SeatsView({
  rooms,
  members,
  roomId,
}: {
  rooms: RoomData[];
  members: AssignableMember[];
  roomId: number | null;
}) {
  const [assignSeat, setAssignSeat] = useState<SeatCardData | null>(null);
  const [openSeat, setOpenSeat] = useState<SeatCardData | null>(null);

  const activeRoom = rooms.find((room) => room.id === roomId) ?? rooms[0] ?? null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ManageSeatsDialog rooms={rooms} />

        {activeRoom && (
          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full sm:w-auto"
            onClick={() => {
              const firstFree = activeRoom.seats.find((seat) => seat.status === "AVAILABLE");
              if (firstFree) setAssignSeat(firstFree);
            }}
            disabled={!activeRoom.seats.some((seat) => seat.status === "AVAILABLE")}
          >
            <UserPlus className="size-4" />
            Assign seat
          </Button>
        )}
      </div>

      {rooms.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No rooms yet. Use “Manage seats” to create Room 1.
        </p>
      ) : (
        <>
          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {rooms.map((room) => (
              <a
                key={room.id}
                href={`/seats?room=${room.id}`}
                className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  room.id === activeRoom?.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                {room.name}
                <span className="ml-2 text-xs opacity-70">{room.seats.length}</span>
              </a>
            ))}
          </nav>

          {activeRoom && (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {activeRoom.seats.map((seat) => (
                  <div key={seat.id} className="group relative">
                    <SeatCard
                      seat={seat}
                      roomName={activeRoom.name}
                      onAssign={() => setAssignSeat(seat)}
                      onOpen={() => setOpenSeat(seat)}
                    />
                    {/* Bottom right, so it never sits on top of the status badge.
                        Always visible on touch screens, revealed on hover elsewhere. */}
                    <div className="absolute right-1.5 bottom-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <DeleteSeatDialog seat={seat} roomName={activeRoom.name} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {activeRoom.seats.filter((seat) => seat.status === "AVAILABLE").length} available,{" "}
                {activeRoom.seats.filter((seat) => seat.status === "OCCUPIED").length} occupied.
                Tap a seat to see the member or assign someone.
              </p>
            </>
          )}
        </>
      )}

      {assignSeat && activeRoom && (
        <AssignSeatDialog
          open
          onOpenChange={(open) => {
            if (!open) setAssignSeat(null);
          }}
          seat={{ id: assignSeat.id, label: `${activeRoom.name} · Seat ${assignSeat.seatNumber}` }}
          members={members}
          action={assignSeatAction as (prev: ActionState, formData: FormData) => Promise<ActionState>}
        />
      )}

      {openSeat && activeRoom && (
        <SeatDetailsDialog
          open
          onOpenChange={(open) => {
            if (!open) setOpenSeat(null);
          }}
          seat={{
            id: openSeat.id,
            label: `${activeRoom.name} · Seat ${openSeat.seatNumber}`,
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

export function AddSeatHint() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Plus className="size-4" />
      Need more seats? Use “Manage seats”.
    </p>
  );
}

export function CloseHint({ onClose }: { onClose: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
      <X className="size-4" />
    </Button>
  );
}