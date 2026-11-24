"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  paymentConfirmationMessage,
  whatsappChatUrl,
  type PaymentConfirmationInfo,
} from "@/lib/whatsapp";

/**
 * Lets a member say how they paid and opens a prefilled WhatsApp confirmation.
 * The message text lives in the shared helper so it can be tested and reused.
 */
export function PaymentConfirmation({
  memberId,
  name,
  month,
  amount,
}: Omit<PaymentConfirmationInfo, "mode">) {
  const [mode, setMode] = useState<PaymentConfirmationInfo["mode"]>("ONLINE");

  const url = useMemo(
    () =>
      whatsappChatUrl(
        paymentConfirmationMessage({ memberId, name, month, amount, mode }),
      ),
    [amount, memberId, mode, month, name],
  );

  return (
    <Card className="rounded-2xl border-0 shadow-sm ring-1 ring-border/80 transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
            <CheckCircle2 className="size-5" />
          </span>
          Confirm your payment
        </CardTitle>
        <CardDescription>
          After paying, send a quick confirmation on WhatsApp. Your receipt appears
          here once the library records the payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor="payment-mode">Paid by</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as PaymentConfirmationInfo["mode"])}>
            <SelectTrigger id="payment-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ONLINE">Online (NEFT)</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          asChild
          size="lg"
          className="h-auto min-h-10 w-full whitespace-normal py-2 text-center leading-snug bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 sm:w-auto"
        >
          <a href={url} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" />
            I&apos;ve paid — confirm on WhatsApp
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
