"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import { MAX_FEE_DUE_DAY, MIN_FEE_DUE_DAY } from "@/lib/constants";
import { ordinalDay } from "@/lib/format";

export function DueDayForm({
  dueDay,
  action,
  onDone,
}: {
  dueDay: number;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="grid gap-4">
      {state.status === "error" && state.message && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="dueDay">Day of the month the fee is due</Label>
        <Input
          id="dueDay"
          name="dueDay"
          type="number"
          inputMode="numeric"
          min={MIN_FEE_DUE_DAY}
          max={MAX_FEE_DUE_DAY}
          step="1"
          defaultValue={dueDay}
          aria-invalid={Boolean(state.fieldErrors?.dueDay)}
          className="h-11"
        />
        {state.fieldErrors?.dueDay ? (
          <p className="text-xs text-destructive">{state.fieldErrors.dueDay}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Currently due on the {ordinalDay(dueDay)}. A shorter month uses its last day, so a
            due day of 31 lands on 28 or 29 in February.
          </p>
        )}
      </div>

      <DueDaySubmitButton />
    </form>
  );
}

function DueDaySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
      {pending ? "Saving…" : "Save due day"}
    </Button>
  );
}