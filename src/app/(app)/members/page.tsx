import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { MemberTable, type EditableMember } from "@/components/member-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterField, SearchInput } from "@/components/filters";
import { FilterSelect } from "@/components/filter-select";
import { listMembers, listOpenSeats, listRooms } from "@/lib/queries";
import { getMonthlyFee, memberFeesByMemberId, withMemberFees } from "@/lib/settings";
import {
  parseRoomFilter,
  roomFilterOptions,
  roomFilterValue,
} from "@/lib/room-filter";
import {
  DEFAULT_MEMBER_SORT,
  isMemberSort,
  MEMBER_SORTS,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Members" };

type SearchParams = Promise<{
  q?: string;
  status?: string;
  room?: string;
  sort?: string;
}>;

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = params.q ?? "";
  const status =
    params.status === "ACTIVE" || params.status === "LEFT" ? params.status : "ALL";
  // An unknown value falls back to the default rather than erroring on a
  // hand-edited or stale link.
  const sort = isMemberSort(params.sort) ? params.sort : DEFAULT_MEMBER_SORT;

  // Rooms come first: a room id in the URL is only trusted if it still points at
  // a room that exists, so a stale link falls back to "All rooms" instead of
  // showing an empty table next to a dropdown that says something else.
  const rooms = await listRooms();
  const room = parseRoomFilter(params.room, rooms);

  // The list grows by scrolling, so this is always the first batch.
  const [{ members, total }, openSeats, standardFee, fees] = await Promise.all([
    listMembers({ search, status, sort, room }),
    listOpenSeats(),
    getMonthlyFee(),
    memberFeesByMemberId(),
  ]);

  const seats = openSeats.map((seat) => ({
    id: seat.id,
    label: `${seat.room.name} · Seat ${seat.seatNumber}`,
  }));

  const roomOptions = roomFilterOptions(rooms);
  const roomValue = roomFilterValue(room);

  // Column headers reuse the current filters, so sorting never discards a
  // search, status or room the user had set. The page number is deliberately
  // left out so applying a sort starts again at the first page.
  const currentFilters = new URLSearchParams();
  if (search) currentFilters.set("q", search);
  if (status !== "ALL") currentFilters.set("status", status);
  if (roomValue !== "ALL") currentFilters.set("room", roomValue);
  const sortBase = currentFilters.toString();

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Members"
        description="Permanent personal record of everyone who joined the library."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <ExportButton
              href="/api/export/members"
              label="Export"
              description="Download every member as an Excel sheet"
              className="w-full sm:w-auto"
            />
            <Button asChild size="lg" className="h-11 w-full sm:w-auto">
              <Link href="/members/new">
                <UserPlus className="size-4" />
                Add Member
              </Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="grid gap-3">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <SearchInput
                defaultValue={search}
                placeholder="Search by name, mobile, member ID or seat"
                standalone={false}
              />
            </div>
            <FilterField label="Status" className="sm:w-40">
              <FilterSelect
                name="status"
                value={status}
                ariaLabel="Filter by status"
                options={[
                  { value: "ALL", label: "All members" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "LEFT", label: "Left" },
                ]}
              />
            </FilterField>
            <FilterField label="Room" className="sm:w-40">
              <FilterSelect
                name="room"
                value={roomValue}
                ariaLabel="Filter by room"
                options={roomOptions}
              />
            </FilterField>
            <FilterField label="Sort by" className="sm:w-56">
              <FilterSelect
                name="sort"
                value={sort}
                ariaLabel="Sort members by"
                options={[...MEMBER_SORTS]}
              />
            </FilterField>
          </form>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-2 py-12 text-center">
            <Search className="size-6 text-muted-foreground" />
            <p className="font-medium">No members found</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {search
                ? "No member matches that search. Try a different name, mobile number, member ID or seat number."
                : room !== undefined
                  ? `No member is sitting in that room right now. Try "All rooms" or "No seat".`
                  : "Add your first member to get started."}
            </p>
            <Button asChild variant="secondary" className="mt-2 h-10">
              <Link href="/members/new">Add Member</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Keyed on the filters so that changing one starts a fresh list instead
        // of appending to rows that no longer match.
        <MemberTable
          key={`${search}|${status}|${roomValue}|${sort}`}
          members={withMemberFees(members, standardFee, fees) as EditableMember[]}
          seats={seats}
          sort={sort}
          sortBase={sortBase}
          total={total}
          query={{ q: search, status, room: roomValue, sort }}
        />
      )}
    </div>
  );
}