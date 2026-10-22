/**
 * Removes the pending placeholders that a paid month left behind.
 *
 * The generator wrote a pending row for a month ("this fee is owed"), and the
 * payment for that month was then recorded as a second row. The month ended up
 * showing both a pending and a paid row, which reads as money still owed.
 *
 * This deletes only the generated placeholder, and only for months that already
 * have a real record (paid or waived). A pending row a person wrote by hand is
 * a real record and is never touched.
 *
 *   npm run clean-auto-pending -- --dry     # report only, change nothing
 *   npm run clean-auto-pending              # remove them
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AUTO_PENDING_REMARK } from "../src/lib/payments";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const dry = process.argv.includes("--dry");

  const placeholders = await prisma.payment.findMany({
    where: { status: "PENDING", remarks: AUTO_PENDING_REMARK },
    include: { member: { select: { name: true, memberId: true } } },
    orderBy: [{ month: "asc" }, { id: "asc" }],
  });

  const stale: typeof placeholders = [];
  for (const row of placeholders) {
    const settled = await prisma.payment.findFirst({
      where: {
        memberId: row.memberId,
        month: row.month,
        id: { not: row.id },
        status: { in: ["PAID", "WAIVED"] },
      },
      select: { id: true, paymentId: true, status: true, amount: true },
    });
    if (settled) stale.push(row);
  }

  if (stale.length === 0) {
    console.log(`Nothing to clean up: ${placeholders.length} pending placeholders, none of them paid.`);
    return;
  }

  console.log(`${stale.length} placeholder(s) for months that were already paid:`);
  for (const row of stale) {
    console.log(
      `  ${row.paymentId} ${row.member.memberId} ${row.member.name} | ${row.month} | Rs ${row.amount}`,
    );
  }

  if (dry) {
    console.log("\nDry run: nothing was changed.");
    return;
  }

  const deleted = await prisma.payment.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
  console.log(`\nRemoved ${deleted.count} placeholder(s). The real payment rows are untouched.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
