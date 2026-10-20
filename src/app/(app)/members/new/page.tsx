import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MemberForm } from "@/components/member-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listOpenSeats, listSelectableMonthOptions } from "@/lib/queries";
import { requirePermission } from "@/lib/permissions";
import { getMonthlyFee } from "@/lib/settings";
import { formatINR } from "@/lib/format";
import { createMemberAction } from "../actions";

export const metadata: Metadata = { title: "Add Member" };

export default async function NewMemberPage() {
  await requirePermission("MEMBERS");
  const [openSeats, fee, months] = await Promise.all([
    listOpenSeats(),
    getMonthlyFee(),
    listSelectableMonthOptions(),
  ]);

  const seats = openSeats.map((seat) => ({
    id: seat.id,
    label: `${seat.room.name} · Seat ${seat.seatNumber}`,
  }));

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Add Member"
        description="Fill the form once. Member ID, seat assignment and the first payment are created for you."
        actions={
          <Button asChild variant="outline" size="lg" className="h-11 w-full sm:w-auto">
            <Link href="/members">
              <ArrowLeft className="size-4" />
              Back to members
            </Link>
          </Button>
        }
      />

      <Card className="max-w-3xl">
        <CardContent>
          <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Standard monthly fee is <span className="font-medium text-foreground">{formatINR(fee)}</span>.{" "}
            You can change the amount for this member below.
          </p>
          <MemberForm
            action={createMemberAction}
            seats={seats}
            months={months}
            defaultFee={fee}
            submitLabel="Save member"
          />
        </CardContent>
      </Card>
    </div>
  );
}