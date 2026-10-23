"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate, formatINR, todayInputValue } from "@/lib/format";
import type { Expense } from "@/generated/prisma/client";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/(app)/expenses/actions";

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

function ExpenseForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: unknown, formData: FormData) => Promise<unknown>;
  defaults?: Partial<Expense>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE as unknown);
  const s = state as {
    status: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };

  return (
    <form
      action={formAction}
      className="grid gap-4"
    >
      {defaults?.id ? <input type="hidden" name="expensePk" value={defaults.id} /> : null}

      {s.status === "error" && s.message ? (
        <p className="text-sm text-destructive">{s.message}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="exp-date">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-date"
            name="date"
            type="date"
            defaultValue={defaults?.date ? new Date(defaults.date).toISOString().slice(0, 10) : todayInputValue()}
            required
            className="h-11"
          />
          <FieldError message={s.fieldErrors?.date} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="exp-amount">
            Amount (₹) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            defaultValue={defaults?.amount ? String(defaults.amount) : ""}
            className="h-11"
          />
          <FieldError message={s.fieldErrors?.amount} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="exp-purpose">
          Purpose <span className="text-destructive">*</span>
        </Label>
        <Input
          id="exp-purpose"
          name="purpose"
          defaultValue={defaults?.purpose ?? ""}
          placeholder="e.g. Electricity bill, repair, snacks"
          className="h-11"
        />
        <FieldError message={s.fieldErrors?.purpose} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="exp-category">Category</Label>
          <Input id="exp-category" name="category" defaultValue={defaults?.category ?? ""} placeholder="Optional" className="h-11" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="exp-paidto">Paid to</Label>
          <Input id="exp-paidto" name="paidTo" defaultValue={defaults?.paidTo ?? ""} placeholder="Person or shop" className="h-11" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="exp-remarks">Remarks</Label>
        <Textarea
          id="exp-remarks"
          name="remarks"
          defaultValue={defaults?.remarks ?? ""}
          placeholder="Extra details (e.g. 700 × 5 = 3500)"
          rows={3}
        />
        <FieldError message={s.fieldErrors?.remarks} />
      </div>

      <div className="flex justify-end">
        <SaveButton label={submitLabel} />
      </div>
    </form>
  );
}

export function ExpensesManager({ expenses, canEdit }: { expenses: Expense[]; canEdit: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<Expense | null>(null);

  return (
    <div className="grid gap-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-11">
                <Plus className="size-4" />
                Add expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Add expense</DialogTitle>
                <DialogDescription>Record money spent on the library.</DialogDescription>
              </DialogHeader>
              <ExpenseForm
                action={createExpenseAction}
                submitLabel="Save expense"
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      {expenses.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No expenses yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Purpose</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Paid to</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Remarks</th>
                {canEdit ? <th className="px-3 py-2 text-right font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{formatDate(item.date)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{item.expenseId}</td>
                  <td className="px-3 py-2.5">{item.purpose}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.category ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.paidTo ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatINR(item.amount)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.remarks ?? "—"}</td>
                  {canEdit ? (
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="icon" className="size-9" onClick={() => setEdit(item)}>
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <DeleteExpenseButton expensePk={item.id} purpose={item.purpose} />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(edit)} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription>{edit?.expenseId}</DialogDescription>
          </DialogHeader>
          {edit ? (
            <ExpenseForm
              action={updateExpenseAction}
              defaults={edit}
              submitLabel="Save changes"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeleteExpenseButton({ expensePk, purpose }: { expensePk: number; purpose: string }) {
  const [pending, startTransition] = useTransition();
  const remove = () => {
    startTransition(async () => {
      const result = await deleteExpenseAction(expensePk);
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
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <AlertDialogDescription>{purpose}</AlertDialogDescription>
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
