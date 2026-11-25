"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE } from "@/lib/action-result";
import { requestOtpAction, verifyOtpAction } from "./actions";

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Sending code
        </>
      ) : (
        "Send me a code"
      )}
    </Button>
  );
}

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Signing in
        </>
      ) : (
        "Set password and sign in"
      )}
    </Button>
  );
}

export function ForgotPasswordForm({ next }: { next?: string }) {
  const [requestState, requestAction] = useActionState(requestOtpAction, IDLE_STATE);
  const [verifyState, verifyAction] = useActionState(verifyOtpAction, IDLE_STATE);
  const [email, setEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  // Derived from the action result, so a successful request shows the code form
  // on the very next render without a cascading state update in an effect.
  const step = requestState.status === "success" && !changingEmail ? "verify" : "request";

  if (step === "verify") {
    return (
      <div className="grid gap-4">
        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{requestState.message ?? `We sent a code to ${email}.`}</span>
        </p>

        <form action={verifyAction} className="grid gap-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="grid gap-1.5">
            <Label htmlFor="code">6 digit code</Label>
            <Input
              id="code"
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

          <div className="grid gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(verifyState.fieldErrors?.newPassword)}
              className="h-11"
            />
            {verifyState.fieldErrors?.newPassword && (
              <p className="text-xs text-destructive">{verifyState.fieldErrors.newPassword}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={Boolean(verifyState.fieldErrors?.confirmPassword)}
              className="h-11"
            />
            {verifyState.fieldErrors?.confirmPassword && (
              <p className="text-xs text-destructive">{verifyState.fieldErrors.confirmPassword}</p>
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
          onClick={() => setChangingEmail(true)}
          className="cursor-pointer text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Need another code? Use a different email
        </button>
      </div>
    );
  }

  return (
    <form action={requestAction} onSubmit={() => setChangingEmail(false)} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="grid gap-1.5">
        <Label htmlFor="recovery-email">Sign-in email</Label>
        <Input
          id="recovery-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          aria-invalid={Boolean(requestState.fieldErrors?.email)}
          className="h-11"
        />
        {requestState.fieldErrors?.email && (
          <p className="text-xs text-destructive">{requestState.fieldErrors.email}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        We will send a one-time code to your registered address. Use it to choose a new password
        and sign in.
      </p>

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
