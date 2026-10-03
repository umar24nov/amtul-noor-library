/**
 * Prints a quick integrity summary of the imported data, for checking the import
 * and the app against the Excel register.
 *
 *   npm run check-data
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const [members, active, left, seats, occupied, payments, offers, total] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { status: "LEFT" } }),
    prisma.seat.count(),
    prisma.seat.count({ where: { status: "OCCUPIED" } }),
    prisma.payment.count(),
    prisma.payment.count({ where: { paymentMode: "OFFER" } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  console.log(`Members          : ${members} (${active} active, ${left} left)`);
  console.log(`Seats            : ${seats} (${occupied} occupied, ${seats - occupied} free)`);
  console.log(`Payments         : ${payments} (${offers} offers, total Rs ${total._sum.amount})`);

  const months = await prisma.payment.groupBy({ by: ["month"], _count: true, orderBy: { month: "desc" } });
  console.log(`Months covered   : ${months.length} (${months.at(-1)?.month} to ${months[0]?.month})`);

  const sample = await prisma.member.findMany({
    take: 3,
    orderBy: { memberId: "asc" },
    include: { seat: { include: { room: true } }, payments: true },
  });
  console.log("\nSample members:");
  for (const member of sample) {
    const paid = member.payments.filter((p) => p.status === "PAID").length;
    console.log(
      `  ${member.memberId} ${member.name} | ${member.mobile ?? "no mobile"} | seat ${member.seat?.seatNumber ?? "-"} | ${paid} payments | joined ${member.joiningDate.toISOString().slice(0, 10)}`,
    );
  }

  const duplicateSeat = await prisma.$queryRaw<{ seatId: number; count: bigint }[]>`
    SELECT "seatId", COUNT(*)::bigint AS count FROM "Member"
    WHERE "seatId" IS NOT NULL AND status = 'ACTIVE'
    GROUP BY "seatId" HAVING COUNT(*) > 1
  `;
  console.log(
    duplicateSeat.length === 0
      ? "\nOK: no seat is shared by two active members."
      : `\nPROBLEM: ${duplicateSeat.length} seats are shared by more than one active member.`,
  );

  const first = sample[0];
  if (first) console.log(`\nFirst member page id: ${first.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });