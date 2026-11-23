"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE } from "@/lib/action-result";
import { requestMemberEmailChangeAction, verifyMemberEmailChangeAction } from "./actions";

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Sending code
        </>
      ) : (
        "Email me a code"
      )}
    </Button>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Checking code
        </>
      ) : (
        "Confirm new email"
      )}
    </Button>
  );
}

/**
 * Changes the email future sign-in codes go to. A code is sent to the NEW
 * address and must be entered before the change takes effect, so a member
 * cannot point their link at an inbox they do not control. Mirrors the
 * request -> verify flow of the link gate.
 */
export function MemberEmailChange({ payToken }: { payToken: string }) {
  const [requestState, requestAction] = useActionState(requestMemberEmailChangeAction, IDLE_STATE);
  const [verifyState, verifyAction] = useActionState(verifyMemberEmailChangeAction, IDLE_STATE);
  const [newEmail, setNewEmail] = useState("");
  const [sendingAgain, setSendingAgain] = useState(false);
  const id = useId();
  const step = requestState.status === "success" && !sendingAgain ? "verify" : "request";

  if (step === "verify") {
    return (
      <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          {requestState.message}
        </p>

        <form action={verifyAction} className="grid gap-4">
          <input type="hidden" name="payToken" value={payToken} />
          <input type="hidden" name="email" value={newEmail} />

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-code`}>6 digit code</Label>
            <Input
              id={`${id}-code`}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              required
              aria-invalid={Boolean(verifyState.fieldErrors?.code)}
              className="h-11 text-center text-lg tracking-[0.4em]"
            />
            {verifyState.fieldErrors?.code && (
              <p className="text-xs text-destructive">{verifyState.fieldErrors.code}</p>
            )}
          </div>

          {verifyState.status === "error" && verifyState.message && (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {verifyState.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <VerifyButton />
            <button
              type="button"
              onClick={() => setSendingAgain(true)}
              className="cursor-pointer text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <form
      action={requestAction}
      onSubmit={() => setSendingAgain(false)}
      className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="payToken" value={payToken} />

      <p className="text-xs text-muted-foreground">
        Future sign-in codes will be sent to the new address. We&apos;ll email a code there first
        to confirm it belongs to you.
      </p>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-email`}>
          New email <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          maxLength={120}
          placeholder="you@example.com"
          required
          autoComplete="email"
          aria-invalid={Boolean(requestState.fieldErrors?.email)}
          className="h-11"
        />
        {requestState.fieldErrors?.email && (
          <p className="text-xs text-destructive">{requestState.fieldErrors.email}</p>
        )}
      </div>

      {requestState.status === "error" && requestState.message && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {requestState.message}
        </p>
      )}

      <RequestButton />
    </form>
  );
}