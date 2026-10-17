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
import { SeatMap } from "@/components/seat-map";
import { submitApplicationAction } from "@/app/join/actions";
import { IDLE_STATE } from "@/lib/action-result";
import { LIBRARY_RULES, PREPARATION_OPTIONS } from "@/lib/constants";
import { SEAT_LAYOUTS, type SeatLayoutKey } from "@/lib/seat-layouts";

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

const selectClass = cn(
  inputClass,
  "w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export type SeatOption = { id: number; seatNumber: string; available: boolean };
export type RoomOption = {
  id: number;
  name: string;
  /** Which drawing to use for this room, or null to fall back to a seat list. */
  layoutKey: SeatLayoutKey | null;
  seats: SeatOption[];
};

export function ApplicationForm({
  className,
  rooms = [],
  defaultRoomId = null,
  defaultSeatNumber = null,
}: {
  className?: string;
  rooms?: RoomOption[];
  /** Pre-filled when the applicant arrived by tapping a seat on the landing map. */
  defaultRoomId?: number | null;
  defaultSeatNumber?: number | null;
}) {
  const [state, formAction] = useActionState(submitApplicationAction, IDLE_STATE);
  const id = useId();
  const [preparingFor, setPreparingFor] = useState("");

  const initialRoom =
    (defaultRoomId != null ? rooms.find((room) => room.id === defaultRoomId) : undefined) ??
    rooms[0] ??
    null;
  const initialSeat =
    initialRoom && defaultSeatNumber != null
      ? initialRoom.seats.find(
          (seat) => Number(seat.seatNumber) === defaultSeatNumber && seat.available,
        )
      : undefined;

  const [roomId, setRoomId] = useState(initialRoom ? String(initialRoom.id) : "");
  const [seatId, setSeatId] = useState(initialSeat ? String(initialSeat.id) : "");
  const selectedRoom = rooms.find((room) => String(room.id) === roomId);
  const selectedSeat = selectedRoom?.seats.find((seat) => String(seat.id) === seatId);
  const selectedLayout = selectedRoom?.layoutKey ? SEAT_LAYOUTS[selectedRoom.layoutKey] : null;

  function chooseSeat(seat: SeatOption) {
    if (seat.available) setSeatId(String(seat.id));
  }

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

      {/* The chosen seat, kept at the top so someone who arrived by tapping a
          seat on the map can see it was carried over rather than having to
          scroll to the seat section to check. */}
      {rooms.length > 0 && (
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
              {selectedSeat && selectedRoom
                ? `${selectedRoom.name} · Seat ${Number(selectedSeat.seatNumber)}`
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
              placeholder="e.g. Mubassir Hussain"
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
              className={cn(selectClass, !preparingFor && "text-muted-foreground")}
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

          <div id="seat" className="grid scroll-mt-24 gap-3 border-t border-border pt-4">
            <div className="grid gap-1">
              <SectionTitle>Choose your seat</SectionTitle>
              <p className="text-xs text-muted-foreground">
                Tap a free seat on the map. Only seats that are free right now
                can be chosen; the owner confirms your seat when your
                application is approved.
              </p>
            </div>

            {rooms.length === 0 ? (
              <p className="text-xs text-destructive">
                No seats are free right now. Please contact the library before
                applying.
              </p>
            ) : (
              <>
                <input type="hidden" name="roomId" value={roomId} />
                <input type="hidden" name="seatId" value={seatId} />

                {rooms.length > 1 && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a room">
                    {rooms.map((room) => {
                      const active = String(room.id) === roomId;
                      const open = room.seats.filter((seat) => seat.available).length;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => {
                            setRoomId(String(room.id));
                            setSeatId("");
                          }}
                          aria-pressed={active}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card hover:bg-muted",
                          )}
                        >
                          {room.name}
                          <span className="ml-2 text-xs opacity-70">{open} free</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <p
                  className={cn(
                    "text-sm font-medium",
                    selectedSeat ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {selectedSeat && selectedRoom
                    ? `${selectedRoom.name} · Seat ${Number(selectedSeat.seatNumber)}`
                    : "No seat chosen yet — tap a free seat."}
                </p>

                {selectedRoom && selectedLayout ? (
                  <SeatMap
                    layout={selectedLayout}
                    seats={selectedRoom.seats.map((seat) => ({
                      number: Number(seat.seatNumber),
                      status: seat.available ? "AVAILABLE" : "OCCUPIED",
                    }))}
                    selectedNumber={selectedSeat ? Number(selectedSeat.seatNumber) : null}
                    onSelectSeat={(number) => {
                      const seat = selectedRoom.seats.find(
                        (candidate) => Number(candidate.seatNumber) === number,
                      );
                      if (seat) chooseSeat(seat);
                    }}
                    ariaLabel={`${selectedRoom.name} seat map. Tap a free seat to choose it.`}
                    className="mx-auto max-w-lg rounded-xl border border-border bg-card p-3"
                  />
                ) : selectedRoom ? (
                  <ul className="grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-8">
                    {selectedRoom.seats.map((seat) => {
                      const isSelected = String(seat.id) === seatId;
                      return (
                        <li key={seat.id}>
                          <button
                            type="button"
                            disabled={!seat.available}
                            onClick={() => chooseSeat(seat)}
                            aria-pressed={isSelected}
                            className={cn(
                              "w-full rounded-md border px-2 py-2.5 text-center font-mono text-xs font-medium transition-colors",
                              !seat.available
                                ? "cursor-not-allowed border-border bg-muted-foreground/30 text-muted-foreground line-through"
                                : isSelected
                                  ? "border-blue-700/40 bg-blue-600 text-white"
                                  : "border-emerald-600/40 bg-emerald-500 text-white hover:brightness-110",
                            )}
                          >
                            {seat.seatNumber}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

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

                <FieldError message={state.fieldErrors?.roomId} />
                <FieldError message={state.fieldErrors?.seatId} />
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