"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Upload } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { SeatMap } from "@/components/seat-map";
import { submitApplicationAction } from "@/app/join/actions";
import { IDLE_STATE } from "@/lib/action-result";
import { AADHAAR_MAX_BYTES, AADHAAR_MAX_MB, LIBRARY_FEES, LIBRARY_RULES } from "@/lib/constants";
import { SEAT_LAYOUTS, type SeatLayoutKey } from "@/lib/seat-layouts";

/** One decimal place is enough to tell a 2 MB photo from a 9 MB one. */
function fileSizeMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

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

/** Friendly names for the fields a validation error can point at, so the error
 *  summary reads like a sentence instead of a key. */
const FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  mobile: "Mobile number",
  email: "Email address",
  address: "Address",
  guardianName: "Father / Guardian name",
  guardianMobile: "Father / Guardian contact",
  aadhaarNumber: "Aadhaar number",
  preparingFor: "What you are preparing for",
  joiningDate: "Date of joining",
  seatId: "Seat",
  agreed: "Rules agreement",
  aadhaarFront: "Aadhaar upload",
};

export type SeatOption = {
  id: number;
  seatNumber: string;
  available: boolean;
  hasLocker: boolean;
};

/** The two tick boxes above the picker. Neither ticked means "show both". */
type SeatType = "all" | "non-locker" | "locker";

const SEAT_GROUPS: { key: SeatLayoutKey; type: Exclude<SeatType, "all"> }[] = [
  { key: "plain", type: "non-locker" },
  { key: "locker", type: "locker" },
];

function seatMatchesType(seat: SeatOption, type: SeatType): boolean {
  return type === "all" || (type === "locker" ? seat.hasLocker : !seat.hasLocker);
}

export function ApplicationForm({
  className,
  seats = [],
  defaultSeatNumber = null,
}: {
  className?: string;
  seats?: SeatOption[];
  /** Pre-filled when the applicant arrived by tapping a seat on the landing map. */
  defaultSeatNumber?: number | null;
}) {
  const [state, formAction] = useActionState(submitApplicationAction, IDLE_STATE);
  const id = useId();
  const [aadhaarFileName, setAadhaarFileName] = useState("");
  const [aadhaarFileError, setAadhaarFileError] = useState("");

  const initialSeat =
    defaultSeatNumber != null
      ? seats.find(
          (seat) => Number(seat.seatNumber) === defaultSeatNumber && seat.available,
        )
      : undefined;

  const [seatId, setSeatId] = useState(initialSeat ? String(initialSeat.id) : "");
  const [seatType, setSeatType] = useState<SeatType>("all");
  const selectedSeat = seats.find((seat) => String(seat.id) === seatId);

  // True when the applicant reached the form by tapping a seat on the landing
  // page, so the seat section can acknowledge the choice already carried over.
  const arrivedWithSeat = Boolean(initialSeat);

  // Flattened field errors for the error summary, with the seat and rules
  // problems spelled out because those controls carry no visible input of their
  // own to highlight.
  const fieldErrorList = Object.entries(state.fieldErrors ?? {}).map(
    ([key, message]) => ({ key, label: FIELD_LABELS[key] ?? key, message }),
  );
  const seatError = Boolean(state.fieldErrors?.seatId);

  function chooseSeat(seat: SeatOption) {
    if (!seat.available || !matchesType(seat)) return;
    const seatKey = String(seat.id);
    if (seatId === seatKey) {
      setSeatId("");
      return;
    }
    setSeatId(seatKey);
  }

  // Tick the same box again to clear it and show both groups.
  function chooseSeatType(next: Exclude<SeatType, "all">) {
    const chosen: SeatType = seatType === next ? "all" : next;
    setSeatType(chosen);
    if (selectedSeat && !seatMatchesType(selectedSeat, chosen)) setSeatId("");
  }

  function matchesType(seat: SeatOption) {
    return seatMatchesType(seat, seatType);
  }

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  // A failed submit should not leave the applicant hunting for the problem: pull
  // the first offending control into view and focus it. Fields with no real
  // input (the seat, the rules checkbox) are targeted through their section.
  useEffect(() => {
    if (state.status !== "error") return;
    const target =
      document.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      document.getElementById("seat");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof target.focus === "function" && target.tabIndex >= 0) target.focus();
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{state.message}</span>
          </p>
          {fieldErrorList.length > 0 && (
            <ul className="mt-2 grid list-disc gap-1 pl-8">
              {fieldErrorList.map((item) => (
                <li key={item.key}>
                  <span className="font-medium">{item.label}:</span> {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The chosen seat, kept at the top so someone who arrived by tapping a
          seat on the map can see it was carried over rather than having to
          scroll to the seat section to check. */}
      {seats.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your seat
            </p>
            <p
              className={cn(
                "mt-0.5 font-medium",
                selectedSeat ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {selectedSeat
                ? `Seat ${Number(selectedSeat.seatNumber)}`
                : "No seat chosen yet"}
            </p>
          </div>
          <a
            href="#seat"
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            {selectedSeat ? "Change seat" : "Choose a seat"}
          </a>
        </div>
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
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-muted-foreground">
                +91
              </span>
              <Input
                id={`${id}-mobile`}
                name="mobile"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit number"
                autoComplete="tel"
                required
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                aria-invalid={Boolean(state.fieldErrors?.mobile)}
                className={cn(inputClass, "pl-12")}
              />
            </div>
            <FieldError message={state.fieldErrors?.mobile} />
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
              required
              placeholder="name@example.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.email} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-address`}>
              Address <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`${id}-address`}
              name="address"
              rows={2}
              required
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
            <Label htmlFor={`${id}-guardianName`}>
              Father / Guardian name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-guardianName`}
              name="guardianName"
              autoComplete="family-name"
              required
              aria-invalid={Boolean(state.fieldErrors?.guardianName)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.guardianName} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-guardianMobile`}>Father / Guardian contact</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-medium text-muted-foreground">
                +91
              </span>
              <Input
                id={`${id}-guardianMobile`}
                name="guardianMobile"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit number"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                aria-invalid={Boolean(state.fieldErrors?.guardianMobile)}
                className={cn(inputClass, "pl-12")}
              />
            </div>
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
            <Input
              id={`${id}-preparingFor`}
              name="preparingFor"
              required
              aria-invalid={Boolean(state.fieldErrors?.preparingFor)}
              className={inputClass}
            />
            <FieldError message={state.fieldErrors?.preparingFor} />
          </div>

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

          <div
            id="seat"
            className={cn(
              "grid scroll-mt-24 gap-3 border-t border-border pt-4",
              seatError && "rounded-lg bg-destructive/5 px-3 pb-3 ring-1 ring-destructive/30",
            )}
          >
            <div className="grid gap-1">
              <SectionTitle>
                {arrivedWithSeat ? "You have already selected a seat" : "Choose your seat"}
              </SectionTitle>
              <p className="text-xs text-muted-foreground">
                {arrivedWithSeat
                  ? "We carried over the seat you tapped. You can pick a different free seat on the map if you change your mind."
                  : "Tap a free seat on the map. Only seats that are free right now can be chosen; the owner confirms your seat when your application is approved."}
              </p>
              {seatError && (
                <FieldError message={state.fieldErrors?.seatId ?? "Please choose a seat"} />
              )}
            </div>

            {seats.length > 0 && (
              <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={seatType === "non-locker"}
                      onChange={() => chooseSeatType("non-locker")}
                      className="size-4 rounded border-input accent-primary"
                    />
                    Non locker seat · ₹{LIBRARY_FEES.seat}/month
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={seatType === "locker"}
                      onChange={() => chooseSeatType("locker")}
                      className="size-4 rounded border-input accent-primary"
                    />
                    Seat with locker · ₹{LIBRARY_FEES.seatWithLocker}/month
                  </label>
                </div>
              </div>
            )}

            {seats.length === 0 ? (
              <p className="text-xs text-destructive">
                No seats are free right now. Please contact the library before
                applying.
              </p>
            ) : (
              <>
                <input type="hidden" name="seatId" value={seatId} />
                <input
                  type="hidden"
                  name="seatType"
                  value={seatType === "all" ? "" : seatType}
                />

                <div className="flex w-full items-center justify-center">
                  <p
                    className={cn(
                      "text-sm font-medium text-center",
                      selectedSeat ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {selectedSeat
                      ? `Seat ${Number(selectedSeat.seatNumber)}`
                      : "No seat chosen yet — tap a free seat."}
                  </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  {SEAT_GROUPS.filter(
                    (group) => seatType === "all" || seatType === group.type,
                  ).map((group) => {
                    const layout = SEAT_LAYOUTS[group.key];
                    const groupSeats = seats.filter(
                      (seat) => seat.hasLocker === (group.key === "locker"),
                    );
                    if (groupSeats.length === 0) return null;
                    const open = groupSeats.filter((seat) => seat.available).length;

                    return (
                      <div
                        key={group.key}
                        className="flex flex-col rounded-xl border border-border bg-card p-3"
                      >
                        <p className="text-center text-sm text-muted-foreground">
                          {open} free of {groupSeats.length}
                        </p>
                        <SeatMap
                          layout={layout}
                          seats={groupSeats.map((seat) => ({
                            number: Number(seat.seatNumber),
                            status: seat.available ? "AVAILABLE" : "OCCUPIED",
                          }))}
                          selectedNumber={
                            selectedSeat?.hasLocker === (group.key === "locker")
                              ? Number(selectedSeat.seatNumber)
                              : null
                          }
                          onSelectSeat={(number) => {
                            const seat = groupSeats.find(
                              (candidate) => Number(candidate.seatNumber) === number,
                            );
                            if (!seat) return;
                            if (!seat.available) {
                              toast.error("This seat is already booked.");
                              return;
                            }
                            chooseSeat(seat);
                          }}
                          ariaLabel={`${layout.label}. Tap a free seat to choose it.`}
                          className="mx-auto mt-3 max-w-lg"
                        />
                      </div>
                    );
                  })}
                </div>

                <ul className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-emerald-600/40 bg-emerald-500" />
                    Free
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-blue-700/40 bg-blue-600" />
                    Your pick
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-3 rounded-sm border border-border bg-muted-foreground/40" />
                    Taken
                  </li>
                </ul>
              </>
            )}
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
            <Label htmlFor={`${id}-aadhaarFrontFile`}>
              Upload Aadhaar <span className="text-destructive">*</span>
            </Label>
            <div
              className={cn(
                "flex h-11 items-center gap-3 rounded-lg border border-input px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                (state.fieldErrors?.aadhaarFront || aadhaarFileError) &&
                  "border-destructive ring-3 ring-destructive/20",
              )}
            >
              <label
                htmlFor={`${id}-aadhaarFrontFile`}
                className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                Choose file
              </label>
              <span className="truncate text-sm text-muted-foreground">
                {aadhaarFileName || "No file chosen"}
              </span>
              <input
                id={`${id}-aadhaarFrontFile`}
                name="aadhaarFront"
                type="file"
                required
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                aria-invalid={Boolean(state.fieldErrors?.aadhaarFront || aadhaarFileError)}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && file.size > AADHAAR_MAX_BYTES) {
                    // Vercel rejects a request body over ~4.5 MB with a bare 413
                    // before the app runs, which reaches the browser only as a
                    // generic error page. Catch the oversized photo here, while
                    // there is still a real message to show, and drop it from the
                    // input so it can never be uploaded.
                    event.target.value = "";
                    setAadhaarFileName("");
                    setAadhaarFileError(
                      `That file is ${fileSizeMb(file.size)} MB. Please choose one under ${AADHAAR_MAX_MB} MB.`,
                    );
                    toast.error(
                      `That file is too large. Please choose one under ${AADHAAR_MAX_MB} MB.`,
                    );
                    return;
                  }
                  setAadhaarFileName(file?.name ?? "");
                  setAadhaarFileError("");
                }}
              />
            </div>
            <FieldError message={state.fieldErrors?.aadhaarFront ?? aadhaarFileError} />
            <p className="text-xs text-muted-foreground">
              JPG, PNG or PDF, up to {AADHAAR_MAX_MB} MB. One attachment is enough; your
              scan is only seen by the owner.
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