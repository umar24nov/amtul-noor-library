"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import { currentMonthKey, monthOptions, todayInputValue, type MonthOption } from "@/lib/format";

export type SeatOption = {
  id: number;
  label: string;
  occupiedBy?: string | null;
};

export type MemberFormDefaults = {
  memberId?: string;
  name?: string;
  mobile?: string;
  email?: string;
  guardianName?: string;
  guardianMobile?: string;
  joiningDate?: string;
  remarks?: string;
  seatId?: number | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold tracking-tight text-foreground">{children}</h3>
  );
}

export function MemberForm({
  action,
  defaults,
  seats,
  months,
  defaultFee,
  showPayment = true,
  submitLabel = "Save member",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: MemberFormDefaults;
  seats: SeatOption[];
  /** Months offered by the picker, derived from the data. Falls back when absent. */
  months?: MonthOption[];
  /** The fee this member pays this month; used to pre-fill the fee and first payment. */
  defaultFee?: number;
  showPayment?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const id = useId();
  const [seatId, setSeatId] = useState<string>(defaults?.seatId ? String(defaults.seatId) : "");
  const [collectPayment, setCollectPayment] = useState(showPayment);
  const [offer3Plus1, setOffer3Plus1] = useState(false);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {defaults?.memberId && <input type="hidden" name="memberId" value={defaults.memberId} />}

      {state.status === "error" && state.message && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <section className="grid gap-3">
        <SectionTitle>Personal information</SectionTitle>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-name`}>
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${id}-name`}
            name="name"
            defaultValue={defaults?.name}
            autoComplete="name"
            required
            aria-invalid={Boolean(state.fieldErrors?.name)}
            className="h-11"
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
            defaultValue={defaults?.mobile}
            placeholder="10-digit number"
            autoComplete="tel"
            required
            aria-invalid={Boolean(state.fieldErrors?.mobile)}
            className="h-11"
          />
          <FieldError message={state.fieldErrors?.mobile} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            defaultValue={defaults?.email}
            placeholder="name@example.com"
            autoComplete="email"
            aria-invalid={Boolean(state.fieldErrors?.email)}
            className="h-11"
          />
          <FieldError message={state.fieldErrors?.email} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-guardianName`}>Guardian name</Label>
            <Input
              id={`${id}-guardianName`}
              name="guardianName"
              defaultValue={defaults?.guardianName}
              className="h-11"
            />
            <FieldError message={state.fieldErrors?.guardianName} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-guardianMobile`}>Guardian mobile</Label>
            <Input
              id={`${id}-guardianMobile`}
              name="guardianMobile"
              type="tel"
              inputMode="numeric"
              defaultValue={defaults?.guardianMobile}
              placeholder="10-digit number"
              aria-invalid={Boolean(state.fieldErrors?.guardianMobile)}
              className="h-11"
            />
            <FieldError message={state.fieldErrors?.guardianMobile} />
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        <SectionTitle>Membership information</SectionTitle>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-joiningDate`}>
              Date of joining <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-joiningDate`}
              name="joiningDate"
              type="date"
              defaultValue={defaults?.joiningDate ?? todayInputValue()}
              required
              aria-invalid={Boolean(state.fieldErrors?.joiningDate)}
              className="h-11"
            />
            <FieldError message={state.fieldErrors?.joiningDate} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-seatId`}>Seat number</Label>
            <select
              id={`${id}-seatId`}
              name="seatId"
              value={seatId}
              onChange={(event) => setSeatId(event.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.seatId)}
              className={cn(
                "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                state.fieldErrors?.seatId && "border-destructive",
              )}
            >
              <option value="">No seat / assign later</option>
              {seats.map((seat) => (
                <option key={seat.id} value={seat.id} disabled={Boolean(seat.occupiedBy)}>
                  {seat.label}
                  {seat.occupiedBy ? ` — ${seat.occupiedBy}` : " — available"}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.seatId} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-monthlyFee`}>
            Monthly fee (₹) <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${id}-monthlyFee`}
            name="monthlyFee"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            defaultValue={defaultFee?.toString() ?? ""}
            required
            aria-invalid={Boolean(state.fieldErrors?.monthlyFee)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            What this member pays each month. Change it if this member&apos;s fee
            differs from the standard. Enter 0 for someone with no fee (they still
            hold their seat).
          </p>
          <FieldError message={state.fieldErrors?.monthlyFee} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-remarks`}>Remarks</Label>
          <Textarea
            id={`${id}-remarks`}
            name="remarks"
            defaultValue={defaults?.remarks}
            placeholder="Anything worth remembering (optional)"
            rows={2}
            className="min-h-18"
          />
          <FieldError message={state.fieldErrors?.remarks} />
        </div>
      </section>

      {showPayment && (
        <section className="grid gap-3">
          <SectionTitle>Initial payment</SectionTitle>

          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={collectPayment}
              onChange={(event) => setCollectPayment(event.target.checked)}
              className="mt-0.5 size-4 rounded border-input accent-primary"
            />
            <span className="text-muted-foreground">
              Record a payment for this member now (optional)
            </span>
          </label>

          {collectPayment && (
            <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2">
              <label className="col-span-full flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="offer3Plus1"
                  value="1"
                  checked={offer3Plus1}
                  onChange={(event) => setOffer3Plus1(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-input accent-primary"
                />
                <span className="text-muted-foreground">
                  This member is taking the <strong>3 months + 1 free</strong>{" "}
                  offer (4 payments recorded automatically)
                </span>
              </label>

              {offer3Plus1 && (
                <p className="col-span-full rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Records <strong>3 months</strong> at the monthly fee from the
                  month you pick above, then the <strong>4th month free</strong>{" "}
                  (₹0), so none of the four months will show as due.
                </p>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-payMonth`}>
                  {offer3Plus1 ? "First paid month" : "Payment month"}
                </Label>
                <select
                  id={`${id}-payMonth`}
                  name="payMonth"
                  defaultValue={currentMonthKey()}
                  className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {(months ?? monthOptions(18, 1)).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={state.fieldErrors?.payMonth} />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-payDate`}>Payment date</Label>
                <Input
                  id={`${id}-payDate`}
                  name="payDate"
                  type="date"
                  defaultValue={todayInputValue()}
                  className="h-11"
                />
                <FieldError message={state.fieldErrors?.payDate} />
              </div>

              {!offer3Plus1 && (
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-payAmount`}>Amount (₹)</Label>
                  <Input
                    id={`${id}-payAmount`}
                    name="payAmount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    defaultValue={defaultFee?.toString() ?? ""}
                    aria-invalid={Boolean(state.fieldErrors?.payAmount)}
                    className="h-11"
                  />
                  <FieldError message={state.fieldErrors?.payAmount} />
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-payMode`}>Payment mode</Label>
                <select
                  id={`${id}-payMode`}
                  name="payMode"
                  defaultValue="ONLINE"
                  className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ONLINE">Online</option>
                  <option value="CASH">Cash</option>
                  {!offer3Plus1 && <option value="OFFER">Offer / Discount</option>}
                </select>
                <FieldError message={state.fieldErrors?.payMode} />
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <SubmitButton className="h-11 w-full sm:w-auto" pendingLabel="Saving">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}