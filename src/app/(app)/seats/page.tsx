import type { Metadata } from "next";
import { Armchair, CircleCheckBig } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { StatCard } from "@/components/stat-card";
import { SeatsView } from "@/components/seats-view";
import { listActiveMembers, listSeatsWithOccupants } from "@/lib/queries";
import { requirePermission } from "@/lib/permissions";
import { SEAT_COUNT, seatHasLocker } from "@/lib/constants";

export const metadata: Metadata = { title: "Seats" };

export default async function SeatsPage() {
  await requirePermission("SEATS");
  const [seats, activeMembers] = await Promise.all([
    listSeatsWithOccupants(),
    listActiveMembers(),
  ]);

  const totalSeats = seats.length;
  const occupiedSeats = seats.filter((seat) => seat.status === "OCCUPIED").length;

  const seatData = seats.map((seat) => ({
    id: seat.id,
    seatNumber: seat.seatNumber,
    status: seat.status,
    hasLocker: seatHasLocker(seat.seatNumber),
    occupants: seat.occupants.map((occupant) => ({
      id: occupant.id,
      name: occupant.name,
      memberId: occupant.memberId,
      mobile: occupant.mobile,
    })),
  }));

  const assignable = activeMembers
    .filter((member) => member.seatId === null)
    .map((member) => ({
      id: member.id,
      name: member.name,
      memberId: member.memberId,
      mobile: member.mobile,
      seatLabel: null,
    }));

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Seats"
        description="Tap a seat to see who sits there, or assign a free seat to an active member. Seats 1–22 are plain and seats 23–44 have a locker."
        actions={
          <ExportButton
            href="/api/export/seats"
            label="Export"
            description="Download every seat and its occupant as an Excel sheet"
            className="w-full sm:w-auto"
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Seats"
          value={totalSeats}
          hint={`Numbered 1–${SEAT_COUNT}`}
          icon={Armchair}
        />
        <StatCard
          label="Available"
          value={totalSeats - occupiedSeats}
          hint="Free to assign"
          icon={CircleCheckBig}
          tone="success"
        />
        <StatCard
          label="Occupied"
          value={occupiedSeats}
          hint={`${assignable.length} members waiting for a seat`}
          icon={Armchair}
          tone="warning"
        />
      </div>

      <SeatsView seats={seatData} members={assignable} />
    </div>
  );
}
