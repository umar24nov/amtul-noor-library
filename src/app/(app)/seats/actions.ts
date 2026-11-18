"use server";

import { revalidatePath } from "next/cache";
import { errorState, prismaErrorMessage, successState, type ActionState } from "@/lib/action-result";
import { actionPermission } from "@/lib/permissions";
import { normalizeSeatNumber } from "@/lib/format";
import { monthlyFeeForSeat } from "@/lib/constants";
import { syncPendingAmounts } from "@/lib/membership";
import { memberFeeKey } from "@/lib/settings";
import { logMemberChange, MEMBER_AUDIT_ACTIONS } from "@/lib/member-audit";
import { prisma } from "@/lib/prisma";
import {
  assignSeatSchema,
  fieldErrors,
  roomEditSchema,
  roomFormSchema,
  seatFormSchema,
  seatLockerSchema,
  seatRangeFormSchema,
} from "@/lib/validators";
import { z } from "zod";

function revalidateSeats() {
  revalidatePath("/seats");
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/members/[id]", "page");
  revalidatePath("/payments");
  revalidatePath("/reminders");
  revalidatePath("/");
}

const releaseSeatSchema = z.object({ seatId: z.coerce.number().int().positive() });

/** Assigns a free seat to an active member, refusing duplicates either way. */
export async function assignSeatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = assignSeatSchema.safeParse({
    seatId: formData.get("seatId"),
    memberId: formData.get("memberId"),
  });

  if (!parsed.success) {
    return errorState("Please check the highlighted fields.", fieldErrors(parsed.error));
  }

  const { seatId, memberId } = parsed.data;

  try {
    const [seat, member] = await Promise.all([
      prisma.seat.findUnique({
        where: { id: seatId },
        include: {
          room: true,
          occupants: { where: { status: "ACTIVE" }, include: { seat: true } },
        },
      }),
      prisma.member.findUnique({ where: { id: memberId } }),
    ]);

    if (!seat) return errorState("That seat no longer exists.");
    if (!member) return errorState("That member no longer exists.");
    if (member.status !== "ACTIVE") {
      return errorState("Only active members can be assigned a seat.");
    }
    if (seat.occupants.length > 0) {
      const name = seat.occupants[0].name;
      return errorState(`Seat ${seat.seatNumber} is already occupied by ${name}.`, {
        seatId: "Seat is already occupied",
      });
    }
    if (member.seatId) {
      const current = await prisma.seat.findUnique({
        where: { id: member.seatId },
        include: { room: true },
      });
      return errorState(
        `${member.name} already has seat ${current?.seatNumber ?? ""}. Release that seat first.`,
        { memberId: "Member already has a seat" },
      );
    }

    // The desk decides the fee: a locker seat is 800 a month, a plain seat 700.
    // Pending rows follow the new fee; paid rows stay as they were recorded.
    const fee = monthlyFeeForSeat(seat.hasLocker);
    await prisma.$transaction(async (tx) => {
      await tx.member.update({ where: { id: memberId }, data: { seatId } });
      await tx.seat.update({ where: { id: seatId }, data: { status: "OCCUPIED" } });
      await tx.setting.upsert({
        where: { key: memberFeeKey(memberId) },
        update: { value: String(fee) },
        create: { key: memberFeeKey(memberId), value: String(fee) },
      });
      await syncPendingAmounts(tx, memberId, fee);
      await logMemberChange(tx, {
        memberId,
        action: MEMBER_AUDIT_ACTIONS.SEAT_ASSIGNED,
        summary: `Seat assigned — monthly fee set to ₹${fee}${seat.hasLocker ? " (locker seat)" : ""}`,
        metadata: { seatId, hasLocker: seat.hasLocker, fee },
      });
    });

    revalidateSeats();
    return successState(
      `Seat ${seat.seatNumber} (${seat.room.name}) assigned to ${member.name}. Monthly fee set to ₹${fee}.`,
    );
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/**
 * Marks one seat as having a locker, or takes the locker away.
 *
 * Lockers are per desk, so this is deliberately a toggle on the seat rather
 * than a property of the room. If somebody is already sitting there, their fee
 * moves with the seat immediately, and their unpaid months are re-priced too.
 */
export async function setSeatLockerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = seatLockerSchema.safeParse({
    seatId: formData.get("seatId"),
    hasLocker: formData.get("hasLocker"),
  });
  if (!parsed.success) return errorState("That seat no longer exists.");

  const { seatId, hasLocker } = parsed.data;
  const fee = monthlyFeeForSeat(hasLocker);

  try {
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      include: { occupants: { where: { status: "ACTIVE" }, select: { id: true, name: true } } },
    });
    if (!seat) return errorState("That seat no longer exists.");
    if (seat.hasLocker === hasLocker) {
      return successState(
        `Seat ${seat.seatNumber} ${hasLocker ? "already has a locker" : "is already a plain seat"}.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.seat.update({ where: { id: seatId }, data: { hasLocker } });
      for (const occupant of seat.occupants) {
        await tx.setting.upsert({
          where: { key: memberFeeKey(occupant.id) },
          update: { value: String(fee) },
          create: { key: memberFeeKey(occupant.id), value: String(fee) },
        });
        await syncPendingAmounts(tx, occupant.id, fee);
        await logMemberChange(tx, {
          memberId: occupant.id,
          action: MEMBER_AUDIT_ACTIONS.FEE_CHANGED,
          summary: `Seat ${seat.seatNumber} changed to ${hasLocker ? "locker" : "plain"} seat — fee ₹${fee}`,
          metadata: { seatId, hasLocker, fee },
        });
      }
    });

    revalidateSeats();
    return successState(
      `Seat ${seat.seatNumber} ${hasLocker ? "now has a locker — ₹800 per month" : "is now a plain seat — ₹700 per month"}.`,
    );
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

/** Frees a seat. The member keeps every other detail. */
export async function releaseSeatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = releaseSeatSchema.safeParse({ seatId: formData.get("seatId") });
  if (!parsed.success) return errorState("That seat no longer exists.");

  try {
    const seat = await prisma.seat.findUnique({
      where: { id: parsed.data.seatId },
      include: { occupants: { where: { status: "ACTIVE" } } },
    });
    if (!seat) return errorState("That seat no longer exists.");

    await prisma.$transaction([
      prisma.member.updateMany({
        where: { seatId: seat.id, status: "ACTIVE" },
        data: { seatId: null },
      }),
      prisma.seat.update({ where: { id: seat.id }, data: { status: "AVAILABLE" } }),
    ]);

    revalidateSeats();
    return successState(`Seat ${seat.seatNumber} is now available.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function addRoomAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = roomFormSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return errorState("Please check the room name.", fieldErrors(parsed.error));
  }

  try {
    await prisma.room.create({ data: { name: parsed.data.name } });
    revalidateSeats();
    return successState(`${parsed.data.name} created.`);
  } catch (error) {
    return errorState(
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A room with that name already exists."
        : prismaErrorMessage(error),
    );
  }
}

/**
 * Renames a room. Seats and members are untouched, so this is the safe way to
 * correct a name that was entered wrongly.
 */
export async function updateRoomAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = roomEditSchema.safeParse({
    roomId: formData.get("roomId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return errorState("Please check the room name.", fieldErrors(parsed.error));
  }

  const existing = await prisma.room.findUnique({ where: { id: parsed.data.roomId } });
  if (!existing) return errorState("That room no longer exists.");

  if (existing.name === parsed.data.name) {
    return successState(`${parsed.data.name} is already the name of this room.`);
  }

  try {
    await prisma.room.update({
      where: { id: parsed.data.roomId },
      data: { name: parsed.data.name },
    });
    revalidateSeats();
    return successState(`Room renamed to ${parsed.data.name}.`);
  } catch (error) {
    return errorState(
      error instanceof Error && error.message.includes("Unique constraint")
        ? "A room with that name already exists."
        : prismaErrorMessage(error),
    );
  }
}

export async function addSeatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = seatFormSchema.safeParse({
    roomId: formData.get("roomId"),
    seatNumber: formData.get("seatNumber"),
  });
  if (!parsed.success) {
    return errorState("Please check the seat number.", fieldErrors(parsed.error));
  }

  const seatNumber = normalizeSeatNumber(parsed.data.seatNumber);

  try {
    await prisma.seat.create({
      data: { roomId: parsed.data.roomId, seatNumber, status: "AVAILABLE" },
    });
    revalidateSeats();
    return successState(`Seat ${seatNumber} added.`);
  } catch (error) {
    return errorState(
      error instanceof Error && error.message.includes("Unique constraint")
        ? `Seat ${seatNumber} already exists in that room.`
        : prismaErrorMessage(error),
    );
  }
}

export async function addSeatRangeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = seatRangeFormSchema.safeParse({
    roomId: formData.get("roomId"),
    from: formData.get("from"),
    to: formData.get("to"),
  });
  if (!parsed.success) {
    return errorState("Please check the seat range.", fieldErrors(parsed.error));
  }

  const from = Number(parsed.data.from);
  const to = Number(parsed.data.to);
  if (to < from) return errorState("The last seat must not be before the first seat.");

  try {
    const existing = await prisma.seat.findMany({
      where: {
        roomId: parsed.data.roomId,
        seatNumber: { in: rangeNumbers(from, to) },
      },
      select: { seatNumber: true },
    });
    const taken = new Set(existing.map((seat) => seat.seatNumber));
    const toCreate = rangeNumbers(from, to)
      .filter((seatNumber) => !taken.has(seatNumber))
      .map((seatNumber) => ({ roomId: parsed.data.roomId, seatNumber }));

    if (toCreate.length === 0) {
      return errorState("Every seat in that range already exists.");
    }

    await prisma.seat.createMany({ data: toCreate });
    revalidateSeats();
    return successState(
      `${toCreate.length} ${toCreate.length === 1 ? "seat" : "seats"} added${
        taken.size > 0 ? `, ${taken.size} already existed` : ""
      }.`,
    );
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

function rangeNumbers(from: number, to: number): string[] {
  const values: string[] = [];
  for (let value = from; value <= to; value += 1) {
    values.push(normalizeSeatNumber(value));
  }
  return values;
}

export async function deleteSeatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = releaseSeatSchema.safeParse({ seatId: formData.get("seatId") });
  if (!parsed.success) return errorState("That seat no longer exists.");

  try {
    const seat = await prisma.seat.findUnique({
      where: { id: parsed.data.seatId },
      include: { occupants: { where: { status: "ACTIVE" } } },
    });
    if (!seat) return errorState("That seat no longer exists.");
    if (seat.occupants.length > 0) {
      return errorState(
        `Seat ${seat.seatNumber} is occupied by ${seat.occupants[0].name}. Release it first.`,
      );
    }

    await prisma.seat.delete({ where: { id: seat.id } });
    revalidateSeats();
    return successState(`Seat ${seat.seatNumber} deleted.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}

export async function deleteRoomAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = await actionPermission("SEATS");
  if ("denied" in gate) return gate.denied;
  const parsed = z.coerce.number().int().positive().safeParse(formData.get("roomId"));
  if (!parsed.success) return errorState("That room no longer exists.");

  try {
    const room = await prisma.room.findUnique({
      where: { id: parsed.data },
      include: {
        seats: { include: { occupants: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!room) return errorState("That room no longer exists.");

    const occupied = room.seats.flatMap((seat) => seat.occupants);
    if (occupied.length > 0) {
      return errorState(
        `${room.name} still has ${occupied.length} occupied ${
          occupied.length === 1 ? "seat" : "seats"
        }. Release them first.`,
      );
    }

    await prisma.room.delete({ where: { id: room.id } });
    revalidateSeats();
    return successState(`${room.name} deleted.`);
  } catch (error) {
    return errorState(prismaErrorMessage(error));
  }
}