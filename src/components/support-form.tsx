"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { submitSupportMessageAction } from "@/app/support/actions";
import { IDLE_STATE } from "@/lib/action-result";
import { SUPPORT_TOPICS } from "@/lib/constants";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

const inputClass =
  "h-11 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

const selectClass = cn(
  inputClass,
  "w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

/**
 * The public help & support form. Used on its own page, so it is a self
 * contained card: the fields, the honeypot and the "thank you" state all live
 * here, the same way the join form does.
 */
export function SupportForm({ className }: { className?: string }) {
  const [state, formAction] = useActionState(submitSupportMessageAction, IDLE_STATE);
  const id = useId();
  const [topic, setTopic] = useState("");

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  // The form is never shown again after a successful send, so a duplicate tap
  // cannot post a second message.
  if (state.status === "success") {
    return (
      <Card className={className}>
        <CardContent className="grid place-items-center gap-2 py-12 text-center">
          <CheckCircle2 className="size-7 text-success" aria-hidden="true" />
          <p className="font-medium text-lg">Message sent</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Thank you for writing to us. We read every message and will reply to
            your email address as soon as we can.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent>
        <form action={formAction} className="grid gap-4" noValidate>
          {/* Honeypot: hidden from people and browsers, filled only by bots. */}
          <input
            type="text"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          {state.status === "error" && state.message && (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {state.message}
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-name`}>
              Your name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-name`}
              name="name"
              autoComplete="name"
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.name} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-email`}>
              Email address <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              required
              aria-invalid={Boolean(state.fieldErrors?.email)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.email} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-topic`}>
              What is this about? <span className="text-destructive">*</span>
            </Label>
            <select
              id={`${id}-topic`}
              name="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
              aria-invalid={Boolean(state.fieldErrors?.topic)}
              className={cn(selectClass, !topic && "text-muted-foreground")}
            >
              <option value="" disabled>
                Choose a topic
              </option>
              {SUPPORT_TOPICS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.topic} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-message`}>
              Your message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`${id}-message`}
              name="message"
              rows={6}
              placeholder="Tell us what you need help with, or describe the problem you ran into."
              required
              aria-invalid={Boolean(state.fieldErrors?.message)}
              className="min-h-none resize-y aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
            />
            <FieldError message={state.fieldErrors?.message} />
          </div>

          <SubmitButton pendingLabel="Sending...">Send message</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
