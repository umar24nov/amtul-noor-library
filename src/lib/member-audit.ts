import "server-only";

import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/login-rate-limit";
import {
  describeUserAgent,
  memberActivityCutoff,
  sanitizeActivityMetadata,
  MEMBER_ACTIVITY_LABELS,
} from "@/lib/member-activity";
import type { MemberAuditAction } from "@/lib/member-activity";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export {
  MEMBER_AUDIT_ACTIONS,
  MEMBER_ACTIVITY_ACTION_OPTIONS,
  MEMBER_ACTIVITY_LABELS,
  isMemberActivityAction,
} from "@/lib/member-activity";
export type { MemberAuditAction } from "@/lib/member-activity";

export type MemberAuditChange = {
  field: string;
  label: string;
  old: unknown;
  new: unknown;
};

export type LogMemberChangeInput = {
  memberId: number;
  action: string | MemberAuditAction;
  summary?: string;
  changes?: MemberAuditChange[];
  metadata?: Record<string, unknown>;
  /**
   * A name here means a member action (no staff actor is attached). Pass `null`
   * to force the staff/system actor; omit it to use the current session.
   */
  actorName?: string | null;
  /** Explicit device description, or omitted to read the current request header. */
  userAgent?: string;
  /** Used only to decide whether to prune; defaults to now. */
  now?: Date;
};

/** Headers can be unavailable in background jobs; never make that fatal. */
export async function getCurrentUserAgent(): Promise<string> {
  try {
    const headerList = await headers();
    return describeUserAgent(headerList.get("user-agent"));
  } catch {
    return "";
  }
}

async function pruneOldActivity(tx: Prisma.TransactionClient | typeof prisma, now: Date) {
  try {
    await tx.memberAuditLog.deleteMany({ where: { createdAt: { lt: memberActivityCutoff(now) } } });
  } catch {
    // Retention cleanup is best effort; queries enforce the cutoff as well.
  }
}

export async function logMemberChange(
  tx: Prisma.TransactionClient | typeof prisma,
  input: LogMemberChangeInput,
) {
  try {
    const [session, ip, headerAgent] = await Promise.all([
      getSession().catch(() => null),
      getClientIp().catch(() => null),
      input.userAgent === undefined ? getCurrentUserAgent() : Promise.resolve(input.userAgent),
    ]);

    // Member self-service rows must not inherit a staff session that happens to
    // be open in the same browser (for example during a staff preview).
    const memberActor = typeof input.actorName === "string" && input.actorName.length > 0;
    let actorName =
      typeof input.actorName === "string" && input.actorName.length > 0
        ? input.actorName
        : session?.email || "System";
    if (!memberActor && session?.userId) {
      const user = await tx.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true },
      });
      actorName = user?.name || user?.email || session.email || "System";
    }

    const metadata = sanitizeActivityMetadata(input.metadata);
    const device = describeUserAgent(input.userAgent ?? headerAgent);
    const metadataWithDevice: Record<string, unknown> = { ...(metadata ?? {}) };
    if (device) metadataWithDevice.device = device;

    await tx.memberAuditLog.create({
      data: {
        memberId: input.memberId,
        actorId: memberActor ? null : (session?.userId ?? null),
        actorName,
        action: input.action,
        summary: input.summary ?? "",
        changes:
          input.changes && input.changes.length > 0
            ? (input.changes as unknown as Prisma.InputJsonValue)
            : undefined,
        metadata:
          Object.keys(metadataWithDevice).length > 0
            ? (metadataWithDevice as Prisma.InputJsonValue)
            : undefined,
        ip: ip ?? "",
      },
    });

    await pruneOldActivity(tx, input.now ?? new Date());
  } catch {
    // Never fail the main action if audit logging fails.
  }
}

export type LogMemberActivityInput = Omit<LogMemberChangeInput, "memberId" | "action">;

/**
 * Writes one member-facing event. Callers pass a member id and the event name;
 * labels, device capture, sanitizing and retention are handled centrally.
 */
export async function logMemberActivity(
  memberId: number,
  action: MemberAuditAction,
  input: LogMemberActivityInput = {},
) {
  await logMemberChange(prisma, {
    ...input,
    memberId,
    action,
    actorName: input.actorName === undefined ? "Member" : input.actorName,
    summary: input.summary ?? MEMBER_ACTIVITY_LABELS[action],
  });
}
