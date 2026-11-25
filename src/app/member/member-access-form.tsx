"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, ArrowRight, KeyRound, Loader2, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE } from "@/lib/action-result";
import {
  requestMemberPortalCodeAction,
  verifyMemberPortalCodeAction,
} from "./actions";

function SubmitButton({ busy, label, busyLabel }: { busy: string; label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </>
      )}
      <span className="sr-only">{busy}</span>
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

/** Two-step, email-verified entry to the private portal. */
export function MemberAccessForm() {
  const id = useId();
  const [requestState, requestAction] = useActionState(
    requestMemberPortalCodeAction,
    IDLE_STATE,
  );
  const [verifyState, verifyAction] = useActionState(
    verifyMemberPortalCodeAction,
    IDLE_STATE,
  );
  const [memberId, setMemberId] = useState("");
  const [email, setEmail] = useState("");
  const [differentDetails, setDifferentDetails] = useState(false);
  const [code, setCode] = useState("");
  const step = requestState.status === "success" && !differentDetails ? "verify" : "request";

  if (step === "verify") {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-200">
          <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{requestState.message}</p>
        </div>

        <form action={verifyAction} className="grid gap-4">
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="email" value={email} />

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-code`}>6 digit code</Label>
            <div className="relative">
              <KeyRound
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={`${id}-code`}
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                required
                aria-invalid={Boolean(verifyState.fieldErrors?.code)}
                className="h-14 pl-10 text-center text-xl font-semibold tracking-[0.45em]"
              />
            </div>
            <FieldError message={verifyState.fieldErrors?.code} />
            <p className="text-xs text-muted-foreground">
              Tap the code in your email to select it, then copy and paste it here.
            </p>
          </div>

          {verifyState.status === "error" && verifyState.message && (
            <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {verifyState.message}
            </p>
          )}

          <SubmitButton busy="Checking code" busyLabel="Checking code" label="Verify code" />

          <button
            type="button"
            onClick={() => {
              setDifferentDetails(true);
              setCode("");
            }}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Use different details
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      action={requestAction}
      onSubmit={() => {
        setDifferentDetails(false);
        setCode("");
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-member-id`}>Member ID</Label>
        <Input
          id={`${id}-member-id`}
          name="memberId"
          value={memberId}
          onChange={(event) => setMemberId(event.target.value.toUpperCase())}
          placeholder="ATN001"
          maxLength={24}
          required
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={Boolean(requestState.fieldErrors?.memberId)}
          className="h-12 font-medium tracking-wide"
        />
        <FieldError message={requestState.fieldErrors?.memberId} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-email`}>Saved email address</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          maxLength={120}
          required
          autoComplete="email"
          aria-invalid={Boolean(requestState.fieldErrors?.email)}
          className="h-12"
        />
        <FieldError message={requestState.fieldErrors?.email} />
      </div>

      <p className="-mt-1 text-xs text-muted-foreground sm:col-span-2">
        You&apos;ll find your Member ID on your membership record or past receipt.
      </p>

      {requestState.status === "error" && requestState.message && (
        <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive sm:col-span-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {requestState.message}
        </p>
      )}

      <div className="sm:col-span-2">
        <SubmitButton busy="Sending code" busyLabel="Sending code" label="Login" />
      </div>
    </form>
  );
}
