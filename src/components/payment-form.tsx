"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AlertCircle, Check, Search } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IDLE_STATE, type ActionState } from "@/lib/action-result";
import { currentMonthKey, formatINR, monthOptions, todayInputValue, type MonthOption } from "@/lib/format";
import { paymentModeLabels, paymentStatusLabels } from "@/lib/constants";
import type { PaymentMode, PaymentStatus } from "@/generated/prisma/enums";

export type MemberOption = {
  id: number;
  name: string;
  memberId: string;
  mobile: string | null;
  seatLabel: string | null;
};

export type PaymentFormDefaults = {
  recordId?: number;
  memberId?: number;
  month?: string;
  amount?: string;
  paymentMode?: PaymentMode;
  paymentDate?: string;
  status?: PaymentStatus;
  remarks?: string;
};

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function MemberPicker({
  members,
  selectedId,
  onSelect,
  error,
  idPrefix,
}: {
  members: MemberOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  error?: string;
  idPrefix: string;
}) {
  const [query, setQuery] = useState("");
  const selected = members.find((member) => member.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(term) ||
        member.memberId.toLowerCase().includes(term) ||
        member.mobile?.includes(term),
    );
  }, [members, query]);

  if (selected) {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-member`}>Member</Label>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {selected.memberId} · {selected.mobile}
              {selected.seatLabel ? ` · ${selected.seatLabel}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => onSelect(null)}
          >
            Change
          </Button>
        </div>
        <input type="hidden" name="memberId" value={selected.id} />
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`${idPrefix}-member-search`}>
        Member <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={`${idPrefix}-member-search`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, member ID or mobile"
          className="h-11 pl-8"
          aria-invalid={Boolean(error)}
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No member matches that search.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => onSelect(member.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{member.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {member.memberId} · {member.mobile}
                      {member.seatLabel ? ` · ${member.seatLabel}` : ""}
                    </span>
                  </span>
                  <Check className="size-4 shrink-0 text-transparent" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PaymentForm({
  action,
  members,
  defaults,
  defaultFee,
  months,
  submitLabel = "Record payment",
  onSuccess,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  members: MemberOption[];
  defaults?: PaymentFormDefaults;
  defaultFee: number;
  /** Months offered by the picker, derived from the data. Falls back when absent. */
  months?: MonthOption[];
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const [memberId, setMemberId] = useState<number | null>(defaults?.memberId ?? null);
  const [status, setStatus] = useState<PaymentStatus>(defaults?.status ?? "PAID");
  const [amount, setAmount] = useState(defaults?.amount ?? String(defaultFee));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(defaults?.paymentMode ?? "ONLINE");

  useEffect(() => {
    if (state.status === "success" && state.message) {
      toast.success(state.message);
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {defaults?.recordId && <input type="hidden" name="recordId" value={defaults.recordId} />}

      {state.status === "error" && state.message && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      )}

      <MemberPicker
        members={members}
        selectedId={memberId}
        onSelect={setMemberId}
        error={state.fieldErrors?.memberId}
        idPrefix={defaults?.recordId ? `edit-${defaults.recordId}` : "new"}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${defaults?.recordId ?? "new"}-month`}>
            Month <span className="text-destructive">*</span>
          </Label>
          <select
            id={`${defaults?.recordId ?? "new"}-month`}
            name="month"
            defaultValue={defaults?.month ?? currentMonthKey()}
            className={cn(FIELD_CLASS, state.fieldErrors?.month && "border-destructive")}
          >
            {(months ?? monthOptions(24, 1)).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors?.month} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${defaults?.recordId ?? "new"}-date`}>
            Payment date <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${defaults?.recordId ?? "new"}-date`}
            name="paymentDate"
            type="date"
            defaultValue={defaults?.paymentDate ?? todayInputValue()}
            required
            className="h-11"
          />
          <FieldError message={state.fieldErrors?.paymentDate} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${defaults?.recordId ?? "new"}-amount`}>
            Amount (₹) <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${defaults?.recordId ?? "new"}-amount`}
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-11"
            aria-invalid={Boolean(state.fieldErrors?.amount)}
          />
          <FieldError message={state.fieldErrors?.amount} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${defaults?.recordId ?? "new"}-mode`}>
            Payment mode <span className="text-destructive">*</span>
          </Label>
          <select
            id={`${defaults?.recordId ?? "new"}-mode`}
            name="paymentMode"
            value={paymentMode}
            onChange={(event) => {
              const next = event.target.value as PaymentMode;
              setPaymentMode(next);
              // An offer is recorded as a paid zero, never as a pending charge.
              setAmount((current) => {
                if (next === "OFFER") return "0";
                return current === "0" ? String(defaultFee) : current;
              });
            }}
            className={FIELD_CLASS}
          >
            {(Object.keys(paymentModeLabels) as PaymentMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {paymentModeLabels[mode]}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors?.paymentMode} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${defaults?.recordId ?? "new"}-status`}>
          Status <span className="text-destructive">*</span>
        </Label>
        <select
          id={`${defaults?.recordId ?? "new"}-status`}
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as PaymentStatus)}
          className={FIELD_CLASS}
        >
          {(Object.keys(paymentStatusLabels) as PaymentStatus[]).map((value) => (
            <option key={value} value={value}>
              {paymentStatusLabels[value]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {status === "PAID" && "Money received for this month."}
          {status === "PENDING" && "Due for this month, not received yet."}
          {status === "WAIVED" && "Given as a free month or discount — amount is kept for the record."}
          {status === "ON_HOLD" && "Member was away this month, so payment is held."}
          {status === "NOT_APPLICABLE" &&
            "Member had not joined yet, so no fee applies to this month."}
        </p>
        <FieldError message={state.fieldErrors?.status} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${defaults?.recordId ?? "new"}-remarks`}>Remarks</Label>
        <Textarea
          id={`${defaults?.recordId ?? "new"}-remarks`}
          name="remarks"
          defaultValue={defaults?.remarks}
          placeholder="Optional note"
          rows={2}
          className="min-h-18"
        />
        <FieldError message={state.fieldErrors?.remarks} />
      </div>

      {memberId !== null && (
        <p className="text-xs text-muted-foreground">
          Recording {formatINR(Number(amount) || 0)} for{" "}
          {paymentStatusLabels[status].toLowerCase()}.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <SaveButton label={submitLabel} />
      </div>
    </form>
  );
}