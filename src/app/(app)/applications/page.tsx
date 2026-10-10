import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterField } from "@/components/filters";
import { FilterSelect } from "@/components/filter-select";
import { PendingApplicationActions } from "@/components/application-card-actions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { cn } from "cn";
import type { ApplicationStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Applications" };

type SearchParams = Promise<{ status?: string }>;

const STATUS_TONE: Record<ApplicationStatus, string> = {
  PENDING: "bg-warning/20 text-warning-foreground ring-warning/40",
  APPROVED: "bg-success/10 text-success ring-success/25",
  REJECTED: "bg-muted text-muted-foreground ring-border",
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function AadhaarFile({ url, label }: { url: string | null; label: string }) {
  if (!url) return null;
  const isPdf = /\.pdf($|\?)/i.test(url) || url.startsWith("blob:");
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      aria-label={`Open ${label} scan`}
    >
      {isPdf ? (
        <span className="block max-w-52 truncate rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors group-hover:border-foreground/30 group-hover:text-foreground">
          {label} (PDF)
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className="max-h-40 rounded-lg border border-border object-cover transition-opacity group-hover:opacity-80"
        />
      )}
    </Link>
  );
}

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status: ApplicationStatus =
    params.status === "PENDING" || params.status === "APPROVED" || params.status === "REJECTED"
      ? params.status
      : "PENDING";

  const applications = await prisma.application.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: { member: { select: { id: true, memberId: true } } },
  });

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Applications"
        description="Membership requests from the public join form. Approving one creates the member automatically."
      />

      <Card>
        <CardContent className="grid gap-3">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FilterField label="Status" className="sm:w-56">
              <FilterSelect
                name="status"
                value={status}
                ariaLabel="Filter applications by status"
                options={[
                  { value: "PENDING", label: "Awaiting review" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
            </FilterField>
          </form>
        </CardContent>
      </Card>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="grid place-items-center gap-2 py-12 text-center">
            <Inbox className="size-6 text-muted-foreground" />
            <p className="font-medium">No applications {status === "PENDING" ? "awaiting review" : "here"}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {status === "PENDING"
                ? "Applications submitted on the public join page appear here once someone fills the form."
                : `No ${STATUS_LABEL[status].toLowerCase()} application matches right now.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    {application.name}
                    <span className="font-normal text-muted-foreground"> · {application.mobile}</span>
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Submitted {formatDate(application.createdAt)} · Desired joining{" "}
                    {formatDate(application.desiredJoiningDate)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("h-5 shrink-0 px-2 ring-1", STATUS_TONE[application.status])}
                >
                  {STATUS_LABEL[application.status]}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-4">
                <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="text-muted-foreground">Preparing for</dt>
                    <dd>
                      {application.preparingFor}
                      {application.otherPreparation ? ` — ${application.otherPreparation}` : ""}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 sm:block">
                    <dt className="text-muted-foreground">Aadhaar</dt>
                    <dd>{application.aadhaarNumber}</dd>
                  </div>
                  {application.guardianName && (
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-muted-foreground">Guardian</dt>
                      <dd>
                        {application.guardianName}
                        {application.guardianMobile ? ` · ${application.guardianMobile}` : ""}
                      </dd>
                    </div>
                  )}
                  {application.email && (
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="truncate">{application.email}</dd>
                    </div>
                  )}
                  {application.address && (
                    <div className="flex justify-between gap-2 sm:block sm:col-span-2">
                      <dt className="text-muted-foreground">Address</dt>
                      <dd>{application.address}</dd>
                    </div>
                  )}
                </dl>

                {(application.aadhaarFrontUrl || application.aadhaarBackUrl) && (
                  <div className="flex flex-wrap gap-3">
                    <AadhaarFile url={application.aadhaarFrontUrl} label="Front side" />
                    <AadhaarFile url={application.aadhaarBackUrl} label="Back side" />
                  </div>
                )}

                {application.status === "PENDING" && (
                  <PendingApplicationActions id={application.id} />
                )}

                {application.status === "APPROVED" && (
                  <p className="text-sm text-muted-foreground">
                    Approved {formatDate(application.decidedAt)}.
                    {application.member && (
                      <>
                        {" "}
                        Member is{" "}
                        <Link
                          href={`/members/${application.member.id}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {application.member.memberId}
                        </Link>
                        .
                      </>
                    )}
                  </p>
                )}

                {application.status === "REJECTED" && (
                  <p className="text-sm text-muted-foreground">
                    Rejected {formatDate(application.decidedAt)}.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}