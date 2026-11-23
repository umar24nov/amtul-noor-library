"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Confirm your payment</CardTitle>
        <CardDescription>
          After paying, send a quick confirmation on WhatsApp. Your receipt appears
          here once the library records the payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-40 gap-1.5">
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
        <Button asChild size="lg" variant="outline">
          <a href={url} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" />
            I&apos;ve paid — confirm on WhatsApp
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
