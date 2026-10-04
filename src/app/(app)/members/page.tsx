import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { MemberTable, type EditableMember } from "@/components/member-table";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterField, SearchInput } from "@/components/filters";
import { FilterSelect } from "@/components/filter-select";
import { listMembers, listOpenSeats } from "@/lib/queries";
import {
  DEFAULT_MEMBER_SORT,
  isMemberSort,
  MEMBER_SORTS,
  PAGE_SIZE,
} from "@/lib/constants";

export const metadata: Metadata = { title: "Members" };

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
  sort?: string;
}>;

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const search = params.q ?? "";
  const status =
    params.status === "ACTIVE" || params.status === "LEFT" ? params.status : "ALL";
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  // An unknown value falls back to the default rather than erroring on a
  // hand-edited or stale link.
  const sort = isMemberSort(params.sort) ? params.sort : DEFAULT_MEMBER_SORT;

  const [{ members, total, pageCount }, openSeats] = await Promise.all([
    listMembers({ search, status, page, sort }),
    listOpenSeats(),
  ]);

  const seats = openSeats.map((seat) => ({
    id: seat.id,
    label: `${seat.room.name} · Seat ${seat.seatNumber}`,
  }));

  // Column headers reuse the current filters, so sorting never discards a
  // search or status the user had set. The page number is deliberately left out
  // so applying a sort starts again at the first page.
  const currentFilters = new URLSearchParams();
  if (search) currentFilters.set("q", search);
  if (status !== "ALL") currentFilters.set("status", status);
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
                : "Add your first member to get started."}
            </p>
            <Button asChild variant="secondary" className="mt-2 h-10">
              <Link href="/members/new">Add Member</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <MemberTable
          members={members as EditableMember[]}
          seats={seats}
          sort={sort}
          sortBase={sortBase}
        />
      )}

      <Pagination
        pathname="/members"
        searchParams={{
          q: search,
          status: status === "ALL" ? undefined : status,
          sort: sort === DEFAULT_MEMBER_SORT ? undefined : sort,
        }}
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        unit="members"
      />
    </div>
  );
}