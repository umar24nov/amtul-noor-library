"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { applyThreePlusOneOfferAction } from "@/app/(app)/members/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentMonthKey } from "@/lib/format";

export function ApplyOfferDialog({
  memberId,
  memberName,
  defaultStartMonth,
}: {
  memberId: number;
  memberName: string;
  defaultStartMonth?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await applyThreePlusOneOfferAction(formData);
      if (result?.status === "success") {
        toast.success(result.message || "3+1 offer applied.");
        setOpen(false);
      } else if (result?.status === "error") {
        toast.error(result.message || "Failed to apply offer.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Gift className="size-4" />
          Apply 3+1 offer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply 3+1 Offer</DialogTitle>
          <DialogDescription>
            Apply the 3+1 offer for {memberName}. This will mark 3 months as paid and 1 month as free.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4">
          <input type="hidden" name="memberId" value={memberId} />
          <div className="grid gap-1.5">
            <Label htmlFor="offer-start">Start month (YYYY-MM)</Label>
            <Input
              id="offer-start"
              name="startMonth"
              type="month"
              defaultValue={defaultStartMonth || currentMonthKey()}
              required
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="offer-date">Payment date</Label>
            <Input id="offer-date" name="payDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="h-11" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="offer-mode">Payment mode</Label>
            <select id="offer-mode" name="payMode" defaultValue="CASH" className="h-11 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Applying..." : "Apply offer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
