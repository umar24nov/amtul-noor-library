import "server-only";

import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type MemberAuditChange = {
  field: string;
  label: string;
  old: unknown;
  new: unknown;
};

export type LogMemberChangeInput = {
  memberId: number;
  action: string;
  summary?: string;
  changes?: MemberAuditChange[];
  metadata?: Record<string, unknown>;
};

export async function logMemberChange(
  tx: Prisma.TransactionClient | typeof prisma,
  input: LogMemberChangeInput,
) {
  try {
    const [session, ip] = await Promise.all([getSession().catch(() => null), getClientIp().catch(() => null)]);

    let actorName = session?.email || "System";
    if (session?.userId) {
      const user = await tx.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } });
      actorName = user?.name || user?.email || session.email || "System";
    }

    await tx.memberAuditLog.create({
      data: {
        memberId: input.memberId,
        actorId: session?.userId ?? null,
        actorName,
        action: input.action,
        summary: input.summary ?? "",
        changes: input.changes && input.changes.length > 0 ? (input.changes as unknown as Prisma.InputJsonValue) : undefined,
        metadata: input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : undefined,
        ip: ip ?? "",
      },
    });
  } catch {
    // Never fail the main action if audit logging fails
  }
}

export const MEMBER_AUDIT_ACTIONS = {
  MEMBER_CREATED: "MEMBER_CREATED",
  MEMBER_UPDATED: "MEMBER_UPDATED",
  MEMBER_MARKED_LEFT: "MEMBER_MARKED_LEFT",
  MEMBER_REJOINED: "MEMBER_REJOINED",
  MEMBER_DELETED: "MEMBER_DELETED",
  SEAT_ASSIGNED: "SEAT_ASSIGNED",
  SEAT_CHANGED: "SEAT_CHANGED",
  SEAT_RELEASED: "SEAT_RELEASED",
  PAYMENT_RECORDED: "PAYMENT_RECORDED",
  PAYMENT_EDITED: "PAYMENT_EDITED",
  PAYMENT_DELETED: "PAYMENT_DELETED",
  FEE_CHANGED: "FEE_CHANGED",
} as const;
