"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { submitApplicationAction } from "@/app/join/actions";
import { IDLE_STATE } from "@/lib/action-result";
import { LIBRARY_RULES, PREPARATION_OPTIONS } from "@/lib/constants";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold tracking-tight text-foreground">{children}</h2>
  );
}

const inputClass =
  "h-11 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20";

export function ApplicationForm({ className }: { className?: string }) {
  const [state, formAction] = useActionState(submitApplicationAction, IDLE_STATE);
  const id = useId();
  const [preparingFor, setPreparingFor] = useState("");

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  // The form is intentionally never shown again after a successful submit, so a
  // duplicate tap cannot create a second application.
  if (state.status === "success") {
    return (
      <Card className={cn("mt-8", className)}>
        <CardContent className="grid place-items-center gap-2 py-12 text-center">
          <p className="font-medium text-lg">Application received</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Thank you for applying to join the library. The owner reviews every
            application and will get back to you on your mobile number.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className={cn("grid gap-6", className)} noValidate>
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
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <Card>
        <CardContent className="grid gap-4">
          <SectionTitle>About you</SectionTitle>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-name`}>
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-name`}
              name="name"
              placeholder="e.g. Mohammad Umar"
              autoComplete="name"
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.name} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-mobile`}>
              Mobile number <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-mobile`}
              name="mobile"
              type="tel"
              inputMode="numeric"
              placeholder="10 digit number"
              autoComplete="tel"
              required
              aria-invalid={Boolean(state.fieldErrors?.mobile)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.mobile} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-email`}>Email address</Label>
            <Input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.email} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-address`}>Address</Label>
            <Textarea
              id={`${id}-address`}
              name="address"
              rows={2}
              placeholder="Street, area, city"
              autoComplete="street-address"
              aria-invalid={Boolean(state.fieldErrors?.address)}
              className="min-h-none resize-y"
            />
            <FieldError message={state.fieldErrors?.address} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <SectionTitle>Guardian details</SectionTitle>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-guardianName`}>Father / Guardian name</Label>
            <Input
              id={`${id}-guardianName`}
              name="guardianName"
              autoComplete="family-name"
              placeholder="e.g. Mohd. Umar"
              aria-invalid={Boolean(state.fieldErrors?.guardianName)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.guardianName} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-guardianMobile`}>Father / Guardian contact</Label>
            <Input
              id={`${id}-guardianMobile`}
              name="guardianMobile"
              type="tel"
              inputMode="numeric"
              placeholder="10 digit number"
              aria-invalid={Boolean(state.fieldErrors?.guardianMobile)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.guardianMobile} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <SectionTitle>Study details</SectionTitle>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-preparingFor`}>
              What are you currently preparing for?{" "}
              <span className="text-destructive">*</span>
            </Label>
            <select
              id={`${id}-preparingFor`}
              name="preparingFor"
              value={preparingFor}
              onChange={(event) => setPreparingFor(event.target.value)}
              required
              aria-invalid={Boolean(state.fieldErrors?.preparingFor)}
              className={cn(
                inputClass,
                "w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                !preparingFor && "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                Choose your preparation
              </option>
              {PREPARATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.preparingFor} />
          </div>

          {preparingFor === "Other" && (
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-otherPreparation`}>
                Tell us what you are preparing for
              </Label>
              <Input
                id={`${id}-otherPreparation`}
                name="otherPreparation"
                placeholder="e.g. Journalism entrance"
                aria-invalid={Boolean(state.fieldErrors?.otherPreparation)}
                className={inputClass}
              />
              <FieldError message={state.fieldErrors?.otherPreparation} />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-joiningDate`}>
              Date of joining <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-joiningDate`}
              name="joiningDate"
              type="date"
              required
              aria-invalid={Boolean(state.fieldErrors?.joiningDate)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.joiningDate} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <SectionTitle>Identity verification</SectionTitle>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-aadhaarNumber`}>
              Aadhaar number <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-aadhaarNumber`}
              name="aadhaarNumber"
              inputMode="numeric"
              placeholder="12 digit Aadhaar number"
              maxLength={14}
              aria-invalid={Boolean(state.fieldErrors?.aadhaarNumber)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.aadhaarNumber} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-aadhaarFront`}>
              Upload Aadhaar <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-aadhaarFrontFile`}
              name="aadhaarFront"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              aria-invalid={Boolean(state.fieldErrors?.aadhaarFront)}
              className="h-11 cursor-pointer"
            />
            <FieldError message={state.fieldErrors?.aadhaarFront} />
            <p className="text-xs text-muted-foreground">
              JPG, PNG or PDF, up to 3 MB. One attachment is enough; your scan is
              only seen by the owner.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4">
          <SectionTitle>Library rules and regulations</SectionTitle>
          <ol className="grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {LIBRARY_RULES.map((rule) => (
              <li key={rule} className="pl-1 marker:font-medium marker:text-foreground">
                {rule}
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">
            Please fill this form carefully. By submitting this form, you agree to
            follow the library rules and regulations.
          </p>

          <label className="flex items-start gap-3 text-sm" htmlFor={`${id}-agreed`}>
            <input
              id={`${id}-agreed`}
              type="checkbox"
              name="agreed"
              value="1"
              className="mt-0.5 size-4 shrink-0 accent-foreground"
              aria-invalid={Boolean(state.fieldErrors?.agreed)}
            />
            <span>
              I have read, understood, and agree to abide by the above rules and
              regulations.
            </span>
          </label>
          <FieldError message={state.fieldErrors?.agreed} />

          <SubmitButton pendingLabel="Submitting...">Submit application</SubmitButton>
        </CardContent>
      </Card>
    </form>
  );
}