"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IDLE_STATE } from "@/lib/action-result";
import { todayInputValue } from "@/lib/format";
import { createMoneyKeptAction } from "@/app/(app)/expenses/money-kept-actions";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-11" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function MoneyKeptAddButton() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createMoneyKeptAction, IDLE_STATE as unknown);
  const s = state as {
    status: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9">
          <Plus className="size-4" />
          Add money
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add money kept</DialogTitle>
          <DialogDescription>Add money received from someone.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          {s.status === "error" && s.message ? (
            <p className="text-sm text-destructive">{s.message}</p>
          ) : null}
          {s.status === "success" ? (
            <p className="text-sm text-green-600">{s.message}</p>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="mk-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input id="mk-date" name="date" type="date" defaultValue={todayInputValue()} required className="h-11" />
            <FieldError message={s.fieldErrors?.date} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mk-person">
              Person <span className="text-destructive">*</span>
            </Label>
            <Input id="mk-person" name="person" placeholder="Name" className="h-11" />
            <FieldError message={s.fieldErrors?.person} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mk-amount">
              Amount (₹) <span className="text-destructive">*</span>
            </Label>
            <Input id="mk-amount" name="amount" type="number" inputMode="decimal" min="0" step="1" className="h-11" />
            <FieldError message={s.fieldErrors?.amount} />
          </div>

          <div className="flex justify-end">
            <SaveButton label="Save" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
