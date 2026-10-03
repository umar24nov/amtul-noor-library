"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import { formatINR } from "@/lib/format";

export function FeeForm({
  fee,
  action,
  onDone,
}: {
  fee: number;
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
        <Label htmlFor="fee">Monthly fee (₹)</Label>
        <Input
          id="fee"
          name="fee"
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          defaultValue={fee}
          aria-invalid={Boolean(state.fieldErrors?.fee)}
          className="h-11"
        />
        {state.fieldErrors?.fee ? (
          <p className="text-xs text-destructive">{state.fieldErrors.fee}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Currently {formatINR(fee)} per month.</p>
        )}
      </div>

      <FeeSubmitButton />
    </form>
  );
}

function FeeSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
      {pending ? "Saving…" : "Save fee"}
    </Button>
  );
}