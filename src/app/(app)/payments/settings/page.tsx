import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SubNav } from "@/components/sub-nav";
import { PaymentAdminActions } from "@/components/payment-admin-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_TABS } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import { getAdminSession } from "@/lib/auth";
import { listSelectableMonthOptions } from "@/lib/queries";
import { getMonthlyFee } from "@/lib/settings";

export const metadata: Metadata = { title: "Payment settings" };

/**
 * The rare, heavier payment jobs, kept off the busy Collect screen: the standard
 * monthly fee, and generating the month's pending rows in one go. Both can
 * rewrite money across many members, so this tab is admin only.
 */
export default async function PaymentSettingsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/payments");

  const [fee, months] = await Promise.all([getMonthlyFee(), listSelectableMonthOptions()]);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Payment settings"
        description="Set the standard fee and generate a month's pending rows."
        below={<SubNav items={PAYMENT_TABS} level={session.level} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standard monthly fee</CardTitle>
            <CardDescription>
              The suggested amount on the payment form, and the amount used when pending rows are
              generated. Currently {formatINR(fee)} per month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentAdminActions fee={fee} months={months} show="fee" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate pending payments</CardTitle>
            <CardDescription>
              Adds one pending record of {formatINR(fee)} for every active member who has no record
              for the chosen month. Members who already paid are left alone. Nothing is overwritten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentAdminActions fee={fee} months={months} show="pending" />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Recording a single payment lives on the{" "}
        <span className="font-medium text-foreground">Collect</span> tab; chasing what is owed is on
        the <span className="font-medium text-foreground">Overdue</span> and{" "}
        <span className="font-medium text-foreground">This month</span> tabs.
      </p>
    </div>
  );
}
