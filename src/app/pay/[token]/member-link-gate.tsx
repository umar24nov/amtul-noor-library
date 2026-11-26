"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE_STATE } from "@/lib/action-result";
import { maskEmail } from "@/lib/email-mask";
import { HERO_PHOTO } from "@/lib/photos";
import { requestMemberLinkCodeAction, verifyMemberLinkCodeAction } from "./actions";

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full shadow-sm" disabled={pending}>
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
    <Button type="submit" size="lg" className="h-11 w-full shadow-sm" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Signing in
        </>
      ) : (
        "Sign In"
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
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-slate-950/10">
      <div className="relative h-40 overflow-hidden bg-card">
        <Image
          src={`/images/${HERO_PHOTO.src}`}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 448px, 100vw"
          className="object-cover opacity-90 dark:opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-card/25 to-card/10 dark:from-background/75 dark:via-background/30 dark:to-background/10" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 text-foreground">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background/80 ring-1 ring-border backdrop-blur-md">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="rounded-xl border border-border/60 bg-card/75 px-3 py-2 backdrop-blur-md dark:bg-background/75">
            <h1 className="font-heading text-lg font-semibold tracking-tight">Verify this link</h1>
            <p className="text-xs text-foreground/70">For your privacy, one code is needed.</p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        {!email ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-sm leading-relaxed">
            We don&apos;t have an email address saved for this member yet, so this link cannot be
            opened. Please contact the library and ask them to add your email to your member
            details.
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

            <p className="text-sm leading-relaxed text-muted-foreground">
              We&apos;ll send a one-time code to{" "}
              <strong className="text-foreground">{maskEmail(email)}</strong>. Use it to open your
              member page.
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
    </div>
  );
}