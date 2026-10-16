/**
 * Creates the second reading room and its seats.
 *
 * The owner's imported register only ever contained "Room 1". The second room
 * exists in the printed design (`room 2.svg`) but not yet in the database, so
 * this script adds it with the same 22 zero-padded seat numbers the seat map
 * expects ("01".."22") and leaves every seat AVAILABLE.
 *
 * Safe to run more than once: the room is upserted by name and only seats that
 * are missing are created, so existing seats and members are never touched.
 *
 * Usage:
 *   npm run seed-room2                       # local database (.env)
 *   node --env-file=.env.neon --import tsx prisma/seed-room2.ts   # Neon
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ROOM_NAME = "Room 2";
const SEAT_COUNT = 22;

async function main() {
  const room = await prisma.room.upsert({
    where: { name: ROOM_NAME },
    update: {},
    create: { name: ROOM_NAME },
  });

  const existing = await prisma.seat.findMany({ where: { roomId: room.id } });
  const present = new Set(existing.map((seat) => seat.seatNumber));

  const missing: { roomId: number; seatNumber: string }[] = [];
  for (let number = 1; number <= SEAT_COUNT; number += 1) {
    const padded = String(number).padStart(2, "0");
    if (!present.has(padded)) missing.push({ roomId: room.id, seatNumber: padded });
  }

  if (missing.length > 0) {
    await prisma.seat.createMany({ data: missing, skipDuplicates: true });
  }

  console.log(
    `${ROOM_NAME} (id ${room.id}): ${existing.length} existing, ${missing.length} created.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
