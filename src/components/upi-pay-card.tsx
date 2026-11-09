import { ExternalLink, Landmark, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { formatINR, formatMonth } from "@/lib/format";
import { bankDetailsConfigured, getBankDetails } from "@/lib/upi";

/**
 * The payment tile on a member's page.
 *
 * 1. A permanent link (/pay/<token>) that the member keeps and reuses every
 *    month: it always shows whatever is due next and lists their receipts for
 *    download. The owner shares this once.
 *
 * 2. Bank transfer (NEFT) details for paying the fee immediately due.
 */
export async function BankPayCard({
  amount,
  month,
  memberId,
  memberPayUrl,
}: {
  amount: number;
  month: string;
  memberId: string;
  memberPayUrl: string | null;
}): Promise<React.ReactElement | null> {
  if (!bankDetailsConfigured()) return null;

  const bank = getBankDetails();
  const memberQr = memberPayUrl
    ? await QRCode.toDataURL(memberPayUrl, {
        width: 220,
        margin: 1,
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <QrCode className="size-4" />
          Member payments
        </CardTitle>
        <CardDescription>
          Share the member&apos;s payment link once — they reuse it every month
          to pay and to download their receipts.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {memberPayUrl && (
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            {memberQr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={memberQr}
                alt={`QR code for ${memberId}'s payment page`}
                className="size-36 rounded-lg border border-border"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Their payment link
              </p>
              <a
                href={memberPayUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all font-mono text-sm text-foreground underline-offset-2 hover:underline"
              >
                {memberPayUrl}
              </a>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={memberPayUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    Open
                  </a>
                </Button>
                <CopyLinkButton
                  text={memberPayUrl}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 border-t border-border pt-5">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              Pay by bank transfer (NEFT)
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            For online payment of your library fee for{" "}
            <strong className="text-foreground">{formatMonth(month)}</strong> (
            <strong className="tabular-nums text-foreground">{formatINR(amount)}</strong>
            ), please use the following bank details. Make sure to enter the
            correct details while making the payment.
          </p>
          <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-muted-foreground">Account holder name</dt>
            <dd className="font-medium break-all">{bank.accountHolder}</dd>
            <dt className="text-muted-foreground">Account number</dt>
            <dd className="font-mono font-medium break-all">{bank.accountNumber}</dd>
            <dt className="text-muted-foreground">IFSC code</dt>
            <dd className="font-mono font-medium break-all">{bank.ifsc}</dd>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

/** @deprecated Use BankPayCard. Kept for compatibility with existing imports. */
export const UpiPayCard = BankPayCard;
