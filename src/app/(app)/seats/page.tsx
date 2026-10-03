import type { Metadata } from "next";
import { Armchair, CircleCheckBig } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { StatCard } from "@/components/stat-card";
import { SeatsView } from "@/components/seats-view";
import { getRoomsWithSeats, listActiveMembers } from "@/lib/queries";

export const metadata: Metadata = { title: "Seats" };

export default async function SeatsPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const rooms = await getRoomsWithSeats();
  const activeMembers = await listActiveMembers();

  const roomId = Number(room);
  const selectedRoom =
    Number.isInteger(roomId) && rooms.some((item) => item.id === roomId) ? roomId : null;

  const totalSeats = rooms.reduce((total, item) => total + item.seats.length, 0);
  const occupiedSeats = rooms.reduce(
    (total, item) => total + item.seats.filter((seat) => seat.status === "OCCUPIED").length,
    0,
  );

  const roomData = rooms.map((item) => ({
    id: item.id,
    name: item.name,
    seats: item.seats.map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      status: seat.status,
      occupants: seat.occupants.map((occupant) => ({
        id: occupant.id,
        name: occupant.name,
        memberId: occupant.memberId,
        mobile: occupant.mobile,
      })),
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
        description="Tap a seat to see who sits there, or assign a free seat to an active member."
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
          hint={`Across ${rooms.length} ${rooms.length === 1 ? "room" : "rooms"}`}
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

      <SeatsView rooms={roomData} members={assignable} roomId={selectedRoom} />
    </div>
  );
}