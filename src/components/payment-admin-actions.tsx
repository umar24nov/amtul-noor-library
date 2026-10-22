"use client";

import { useState } from "react";
import { FeeForm } from "@/components/fee-form";
import { Button } from "@/components/ui/button";
import { monthOptions, type MonthOption } from "@/lib/format";
import { generatePendingAction, updateFeeAction } from "@/app/(app)/payments/actions";

/**
 * Wraps the two admin payment jobs so the settings page can show them as plain
 * cards instead of dialogs. `show` picks which one to render, so the same
 * component can sit in either card without duplicating the form logic.
 */
export function PaymentAdminActions({
  fee,
  months,
  show,
}: {
  fee: number;
  months?: MonthOption[];
  show: "fee" | "pending";
}) {
  if (show === "fee") {
    return <FeeForm fee={fee} action={updateFeeAction} />;
  }
  return <PendingGenerator months={months} />;
}

function PendingGenerator({ months }: { months?: MonthOption[] }) {
  const options = months ?? monthOptions(24, 1);
  const [selected, setSelected] = useState(options[0]?.value ?? "");
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (formData) => {
        setPending(true);
        try {
          const result = await generatePendingAction({ status: "idle" }, formData);
          window.alert(result.message ?? "Could not generate pending payments.");
        } finally {
          setPending(false);
        }
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="month" value={selected} />
      <div className="grid gap-1.5">
        <label htmlFor="pending-month" className="text-sm font-medium">
          Month
        </label>
        <select
          id="pending-month"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? "Generating…" : "Generate pending"}
      </Button>
      <p className="text-xs text-muted-foreground">
        This only adds missing rows, and only for members who had joined by that month. Existing
        records — paid or pending — are never changed.
      </p>
    </form>
  );
}
