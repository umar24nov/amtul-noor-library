"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE } from "@/lib/action-result";
import { maskEmail } from "@/lib/email-mask";
import { requestMemberLinkCodeAction, verifyMemberLinkCodeAction } from "./actions";

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
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
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Checking code
        </>
      ) : (
        "View my payment page"
      )}
    </Button>
  );
}

export function MemberLinkGate({
  payToken,
  email,
}: {
  payToken: string;
  email: string | null;
}) {
  const [requestState, requestAction] = useActionState(requestMemberLinkCodeAction, IDLE_STATE);
  const [verifyState, verifyAction] = useActionState(verifyMemberLinkCodeAction, IDLE_STATE);
  const [sendingAgain, setSendingAgain] = useState(false);
  const step = requestState.status === "success" && !sendingAgain ? "verify" : "request";

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-heading text-lg font-semibold tracking-tight">Verify this link</h1>
          <p className="text-sm text-muted-foreground">For your privacy, one code is needed.</p>
        </div>
      </div>

      {!email ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-sm">
          We don&apos;t have an email address saved for this member yet, so this link cannot be
          opened. Please contact the library and ask them to add your email to your member details.
        </p>
      ) : step === "verify" ? (
        <div className="grid gap-4">
          <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            {requestState.message}
          </p>

          <form action={verifyAction} className="grid gap-4">
            <input type="hidden" name="payToken" value={payToken} />

            <div className="grid gap-1.5">
              <Label htmlFor="member-code">6 digit code</Label>
              <Input
                id="member-code"
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

            <VerifyButton />
          </form>

          <button
            type="button"
            onClick={() => setSendingAgain(true)}
            className="cursor-pointer text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Send another code
          </button>
        </div>
      ) : (
        <form action={requestAction} onSubmit={() => setSendingAgain(false)} className="grid gap-4">
          <input type="hidden" name="payToken" value={payToken} />

          <p className="text-sm text-muted-foreground">
            We&apos;ll email a one-time code to <strong className="text-foreground">{maskEmail(email)}</strong>.
            Use it to see your fee details and receipts.
          </p>

          {requestState.status === "error" && requestState.message && (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {requestState.message}
            </p>
          )}

          <RequestButton />
        </form>
      )}
    </div>
  );
}
