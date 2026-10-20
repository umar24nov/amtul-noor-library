"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";

export type AssignableMember = {
  id: number;
  name: string;
  memberId: string;
  mobile: string | null;
  seatLabel: string | null;
};

function ActionMessage({ state }: { state: ActionState }) {
  if (state.status === "error" && state.message) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {state.message}
      </p>
    );
  }
  return null;
}

function DialogSubmit({
  children,
  pendingLabel,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "default" | "destructive" | "outline";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size="lg"
      className="h-11 w-full sm:w-auto"
      disabled={pending || disabled}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Assigns a free seat to an active member. */
export function AssignSeatDialog({
  open,
  onOpenChange,
  seat,
  members,
  action,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seat: { id: number; label: string };
  members: AssignableMember[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const filtered = term
    ? members.filter(
        (member) =>
          member.name.toLowerCase().includes(term) ||
          member.memberId.toLowerCase().includes(term) ||
          member.mobile?.includes(term),
      )
    : members;

  const chosen = members.find((member) => member.id === memberId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="sticky top-0">
          <DialogTitle>Assign {seat.label}</DialogTitle>
          <DialogDescription>
            Pick an active member without a seat. A seat can only belong to one active member.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="seatId" value={seat.id} />
          {memberId !== null && <input type="hidden" name="memberId" value={memberId} />}

          <ActionMessage state={state} />

          {chosen ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{chosen.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {chosen.memberId} · {chosen.mobile}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => setMemberId(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor={`assign-search-${seat.id}`}>
                  Member <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id={`assign-search-${seat.id}`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, member ID or mobile"
                    className="h-11 pl-8"
                  />
                </div>
              </div>

              {state.fieldErrors?.memberId && (
                <p className="text-xs text-destructive">{state.fieldErrors.memberId}</p>
              )}

              <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No active member without a seat matches that search.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((member) => (
                      <li key={member.id}>
                        <button
                          type="button"
                          onClick={() => setMemberId(member.id)}
                          className="w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                        >
                          <span className="block text-sm font-medium">{member.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {member.memberId} · {member.mobile}
                            {member.seatLabel ? ` · ${member.seatLabel}` : " · No seat"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <DialogSubmit pendingLabel="Assigning…" disabled={memberId === null}>
              Assign seat
            </DialogSubmit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Shows who is sitting in a seat and lets staff release it. */
export function SeatDetailsDialog({
  open,
  onOpenChange,
  seat,
  releaseAction,
  viewHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seat: {
    id: number;
    label: string;
    occupants: { id: number; name: string; memberId: string; mobile: string | null }[];
  };
  releaseAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  viewHref?: string;
}) {
  const [state, formAction] = useActionState(releaseAction, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success") onOpenChange(false);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{seat.label}</DialogTitle>
          <DialogDescription>
            {seat.occupants.length > 0
              ? "Currently occupied."
              : "This seat is free and ready to be assigned."}
          </DialogDescription>
        </DialogHeader>

        <ActionMessage state={state} />

        {seat.occupants.length > 0 ? (
          <>
            <div className="grid gap-2 rounded-lg border border-border p-3">
              {seat.occupants.map((occupant) => (
                <div key={occupant.id}>
                  <p className="font-medium">{occupant.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {occupant.memberId} · {occupant.mobile}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {viewHref && (
                <Button asChild variant="outline" size="lg" className="h-11 flex-1">
                  <a href={viewHref}>View member</a>
                </Button>
              )}
              <form action={formAction} className="flex-1">
                <input type="hidden" name="seatId" value={seat.id} />
                <DialogSubmit pendingLabel="Releasing…" variant="destructive">
                  Release seat
                </DialogSubmit>
              </form>
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            Assign this seat from the seat card, or use “Assign seat” in the toolbar.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Small form used by the "Manage rooms and seats" dialog. */
export function ManageForm({
  action,
  submitLabel,
  pendingLabel,
  fields,
  roomId,
  hidden,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel: string;
  fields: React.ReactNode;
  roomId?: number;
  hidden?: Record<string, string>;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-3">
      {roomId !== undefined && <input type="hidden" name="roomId" value={roomId} />}
      {hidden &&
        Object.entries(hidden).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <ActionMessage state={state} />
      {fields}
      <DialogSubmit pendingLabel={pendingLabel} variant="outline">
        {submitLabel}
      </DialogSubmit>
    </form>
  );
}

export function ConfirmDeleteForm({
  action,
  message,
  seatId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  message: string;
  seatId: number;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="seatId" value={seatId} />
      <ActionMessage state={state} />
      <DialogSubmit pendingLabel="Deleting…" variant="destructive">
        {message}
      </DialogSubmit>
    </form>
  );
}

export function ConfirmDeleteRoomForm({
  action,
  message,
  roomId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  message: string;
  roomId: number;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="roomId" value={roomId} />
      <ActionMessage state={state} />
      <DialogSubmit pendingLabel="Deleting…" variant="destructive">
        {message}
      </DialogSubmit>
    </form>
  );
}