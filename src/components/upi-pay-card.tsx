import { ExternalLink, QrCode, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/copy-link-button";
import {
  LIBRARY_UPI_ID,
  LIBRARY_UPI_NAME,
  LIBRARY_UPI_QR_PATH,
} from "@/lib/constants";
import { formatINR, formatMonth } from "@/lib/format";
import { upiIsConfigured, upiPayLink } from "@/lib/upi";

/**
 * The payment tile on a member's page. It has two jobs:
 *
 * 1. A permanent link (/pay/<token>) that the member keeps and reuses every
 *    month: it always shows whatever is due next and lists their receipts for
 *    download. The owner shares this once (QR, link, or copy), and that is the
 *    "same link" for all future payments.
 *
 * 2. A quick pay tile for the fee immediately in front of them: a QR of the
 *    upi:// link for the single due month plus a button to open it anywhere.
 *
 * Everything renders nothing until LIBRARY_UPI_ID is set, so turning the
 * feature on is one constant change rather than a deploy-and-hope.
 */
export async function UpiPayCard({
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
  if (!upiIsConfigured()) return null;

  const note = `${LIBRARY_UPI_NAME} — ${memberId} ${formatMonth(month)}`;
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

        <div className="flex flex-wrap items-center gap-6 border-t border-border pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LIBRARY_UPI_QR_PATH}
            alt={`Scan to pay ${formatINR(amount)} for ${formatMonth(month)}`}
            className="size-40 rounded-lg border border-border"
          />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm">
              Pay <strong className="tabular-nums">{formatINR(amount)}</strong> for{" "}
              <strong>{formatMonth(month)}</strong> to:
            </p>
            <p className="font-mono text-sm font-medium">{LIBRARY_UPI_ID}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={upiPayLink(amount, note)}>
                  <Smartphone className="size-4" />
                  Open in your UPI app
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}