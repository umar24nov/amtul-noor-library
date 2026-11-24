"use client";

import { Landmark, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A single, obvious way into the NEFT details. The dialog keeps the numbers
 * readable on a phone without making the fees page itself wide or cluttered.
 * It is rendered only for members who actually have a fee to pay, so a ₹0
 * member never receives bank details in the page payload.
 */
export function PayFeesButton({
  amount,
  month,
  bank,
}: {
  amount: string;
  month: string;
  bank: { accountHolder: string; accountNumber: string; ifsc: string };
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-9 w-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 sm:w-auto"
        >
          <Landmark className="size-3.5" aria-hidden="true" />
          Pay fees
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay fees by NEFT</DialogTitle>
          <DialogDescription>
            Use these bank details for {month} ({amount}). After the transfer, confirm it on
            WhatsApp from the fees page.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 rounded-xl bg-slate-950 p-4 text-sm text-white">
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Account holder
            </dt>
            <dd className="mt-1 break-words font-medium">{bank.accountHolder}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Account number
            </dt>
            <dd className="mt-1 break-all font-mono font-medium">{bank.accountNumber}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
              IFSC code
            </dt>
            <dd className="mt-1 break-all font-mono font-medium">{bank.ifsc}</dd>
          </div>
        </dl>

        <DialogFooter className="sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:mr-auto">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            NEFT only
          </p>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
