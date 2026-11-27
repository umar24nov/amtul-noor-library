import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { FilterBar, FilterField, SearchInput } from "@/components/filters";
import { FilterSelect } from "@/components/filter-select";
import { MemberActivityTable } from "@/components/member-activity-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  isMemberActivityAction,
  MEMBER_ACTIVITY_ACTION_OPTIONS,
} from "@/lib/member-activity";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { listMemberActivity, MEMBER_ACTIVITY_PAGE_SIZE } from "@/lib/queries";

export const metadata: Metadata = { title: "Member Activity" };

type SearchParams = Promise<{
  q?: string | string[];
  member?: string | string[];
  action?: string | string[];
  days?: string | string[];
  page?: string | string[];
}>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

/**
 * A read-only view of every member event: sign-ins, sign-outs, code requests,
 * failed codes, self-edits, email changes, receipts and staff changes.
 * The Users permission gates both this page and the sidebar link.
 */
export default async function MemberActivityPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("USERS");
  const params = await searchParams;

  const q = first(params.q).trim();
  const memberParam = Number(first(params.member));
  const memberId =
    Number.isInteger(memberParam) && memberParam > 0 ? memberParam : null;
  const actionParam = first(params.action);
  const action = isMemberActivityAction(actionParam) ? actionParam : "ALL";
  const daysParam = Number(first(params.days));
  const days = DAY_OPTIONS.some((option) => Number(option.value) === daysParam) ? daysParam : 365;
  const pageParam = Number(first(params.page));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [result, members] = await Promise.all([
    listMemberActivity({
      q,
      memberId: memberId ?? undefined,
      action: action === "ALL" ? undefined : action,
      days,
      page,
    }),
    prisma.member.findMany({
      orderBy: { memberId: "asc" },
      select: { id: true, memberId: true, name: true },
    }),
  ]);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Member Activity"
        description="Every member sign-in, sign-out, code request, detail change and receipt event, newest first. Entries are kept for 12 months."
        actions={
          <Button asChild variant="outline" size="lg" className="h-11">
            <Link href="/users">
              <History className="size-4" />
              Staff activity
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3">
          <FilterBar>
            <FilterField label="Search" className="min-w-0 flex-1">
              <SearchInput
                defaultValue={q}
                placeholder="Search member, actor or event"
                standalone={false}
              />
            </FilterField>
            <FilterField label="Member" className="sm:w-56">
              <FilterSelect
                name="member"
                value={memberId ? String(memberId) : ""}
                ariaLabel="Filter by member"
                options={[
                  { value: "", label: "All members" },
                  ...members.map((member) => ({
                    value: String(member.id),
                    label: `${member.memberId} · ${member.name}`,
                  })),
                ]}
              />
            </FilterField>
            <FilterField label="Event" className="sm:w-56">
              <FilterSelect
                name="action"
                value={action}
                ariaLabel="Filter by event"
                options={[{ value: "ALL", label: "All events" }, ...MEMBER_ACTIVITY_ACTION_OPTIONS]}
              />
            </FilterField>
            <FilterField label="Window" className="sm:w-40">
              <FilterSelect
                name="days"
                value={String(days)}
                ariaLabel="Filter by time window"
                options={DAY_OPTIONS}
              />
            </FilterField>
          </FilterBar>
        </CardContent>
      </Card>

      <MemberActivityTable
        rows={result.rows}
        total={result.total}
        page={result.page}
        pageSize={MEMBER_ACTIVITY_PAGE_SIZE}
        filters={{
          q,
          memberId,
          action,
          days,
        }}
      />
    </div>
  );
}
