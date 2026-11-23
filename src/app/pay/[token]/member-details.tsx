"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE } from "@/lib/action-result";
import { updateMemberDetailsAction } from "./actions";

/** The personal fields a member may correct themselves. */
export type MemberEditableDetails = {
  name: string;
  mobile: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Saving
        </>
      ) : (
        "Save changes"
      )}
    </Button>
  );
}

/**
 * Lets a member fix their own name and contact numbers. Seat, fee, joining
 * date, status and internal remarks are deliberately not here — those stay
 * staff-only. The page remounts this component (via a key on updatedAt) after
 * a save, so the form closes and the fresh values show.
 */
export function MemberDetailsEditor({
  payToken,
  details,
}: {
  payToken: string;
  details: MemberEditableDetails;
}) {
  const [state, formAction] = useActionState(updateMemberDetailsAction, IDLE_STATE);
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" />
        Correct my details
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <input type="hidden" name="payToken" value={payToken} />

      <p className="text-xs text-muted-foreground">
        You can correct your name and contact numbers. Your seat, fee and joining date are
        managed by the library — contact support to change those.
      </p>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-name`}>
          Full name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={details.name}
          maxLength={80}
          required
          autoComplete="name"
          aria-invalid={Boolean(state.fieldErrors?.name)}
          className="h-11"
        />
        <FieldError message={state.fieldErrors?.name} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-mobile`}>Mobile number</Label>
        <Input
          id={`${id}-mobile`}
          name="mobile"
          type="tel"
          inputMode="numeric"
          defaultValue={details.mobile ?? ""}
          placeholder="10 digit mobile number"
          autoComplete="tel"
          aria-invalid={Boolean(state.fieldErrors?.mobile)}
          className="h-11"
        />
        <FieldError message={state.fieldErrors?.mobile} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-guardianName`}>Guardian name</Label>
          <Input
            id={`${id}-guardianName`}
            name="guardianName"
            defaultValue={details.guardianName ?? ""}
            maxLength={80}
            aria-invalid={Boolean(state.fieldErrors?.guardianName)}
            className="h-11"
          />
          <FieldError message={state.fieldErrors?.guardianName} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-guardianMobile`}>Guardian mobile</Label>
          <Input
            id={`${id}-guardianMobile`}
            name="guardianMobile"
            type="tel"
            inputMode="numeric"
            defaultValue={details.guardianMobile ?? ""}
            placeholder="10 digit mobile number"
            aria-invalid={Boolean(state.fieldErrors?.guardianMobile)}
            className="h-11"
          />
          <FieldError message={state.fieldErrors?.guardianMobile} />
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}