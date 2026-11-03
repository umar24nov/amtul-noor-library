"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { IDLE_STATE } from "@/lib/action-result";
import { formatDate } from "@/lib/format";
import { createMoneyKeptAction, deleteMoneyKeptAction, updateMoneyKeptAction } from "@/app/(app)/expenses/money-kept-actions";
import type { MoneyKept } from "@/generated/prisma/client";

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
  const [state, formAction] = useActionState(createMoneyKeptAction as unknown as (prev: unknown, formData: FormData) => Promise<unknown>, IDLE_STATE as unknown);
  const s = state as {
    status: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 border-gray-400">
          <Plus className="size-4" />
          Add money
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Add Money Kept</DialogTitle>
          <DialogDescription>Add money received from someone</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          {s.status === "error" && s.message ? (
            <p className="text-sm text-destructive">{s.message}</p>
          ) : null}
          {s.status === "success" ? (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Entry added successfully.</div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="mk-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input id="mk-date" name="date" type="text" placeholder="" required className="h-11" />
            <FieldError message={s.fieldErrors?.date} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mk-person">
              Person <span className="text-destructive">*</span>
            </Label>
            <Input id="mk-person" name="person" className="h-11" />
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

export function MoneyKeptActions({ item }: { item: MoneyKept }) {
  const [editOpen, setEditOpen] = useState(false);
  const [state, formAction] = useActionState(updateMoneyKeptAction as unknown as (prev: unknown, formData: FormData) => Promise<unknown>, IDLE_STATE as unknown);
  const s = state as {
    status: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };

  const handleOpenChange = (open: boolean) => {
    setEditOpen(open);
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="size-9">
            <Pencil className="size-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Edit Money Kept</DialogTitle>
            <DialogDescription>{String(item.moneyKeptId).replace(/^MK/, "")}</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="moneyKeptPk" value={item.id} />
            {s.status === "error" && s.message ? (
              <p className="text-sm text-destructive">{s.message}</p>
            ) : null}
            {s.status === "success" ? (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">Entry updated successfully.</div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="mk-edit-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input id="mk-edit-date" name="date" type="text" defaultValue={(item as { dateLabel?: string | null }).dateLabel || ""} required className="h-11" />
              <FieldError message={s.fieldErrors?.date} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="mk-edit-person">
                Person <span className="text-destructive">*</span>
              </Label>
              <Input id="mk-edit-person" name="person" defaultValue={item.person} className="h-11" />
              <FieldError message={s.fieldErrors?.person} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="mk-edit-amount">
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input id="mk-edit-amount" name="amount" type="number" inputMode="decimal" min="0" step="1" defaultValue={String(item.amount)} className="h-11" />
              <FieldError message={s.fieldErrors?.amount} />
            </div>

            <div className="flex justify-end">
              <SaveButton label="Save changes" />
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteMoneyKeptButton moneyKeptPk={item.id} person={item.person} />
    </div>
  );
}

function DeleteMoneyKeptButton({ moneyKeptPk, person }: { moneyKeptPk: number; person: string }) {
  const [pending, startTransition] = useTransition();
  const remove = () => {
    startTransition(async () => {
      const result = await deleteMoneyKeptAction(moneyKeptPk);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not delete");
        return;
      }
      toast.success(result.message ?? "Deleted");
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-9 text-destructive">
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>{person}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
