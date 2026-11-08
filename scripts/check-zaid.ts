import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.neon" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const member = await prisma.member.findFirst({
    where: { OR: [{ memberId: "ATN053" }, { name: { contains: "Zaid", mode: "insensitive" } }] },
    include: { payments: { orderBy: [{ month: "asc" }, { createdAt: "asc" }] }, seat: { include: { room: true } } },
  });
  console.log(JSON.stringify(member, (k,v) => typeof v === "bigint" ? v.toString() : v instanceof Date ? v.toISOString() : v, 2));

  // find similar cases - members with single payment >= 2000 or payments that look like offer claims
  const all = await prisma.member.findMany({
    where: { status: "ACTIVE" },
    include: { payments: { orderBy: [{ month: "asc" }] } },
  });
  const candidates = all.filter(m => {
    const paid = m.payments.filter(p => p.status === "PAID");
    const hasOffer = paid.some(p => String(p.remarks || "").includes("3 + 1") || p.paymentMode === "OFFER");
    const total = paid.reduce((s,p) => s + Number(p.amount), 0);
    // single large payment around 2100 or multiple of 700?
    return (!hasOffer && total >= 2000 && paid.length <= 2) || hasOffer;
  }).map(m => ({ memberId: m.memberId, name: m.name, joiningDate: m.joiningDate, payments: m.payments.map(p => ({ paymentId: p.paymentId, month: p.month, amount: Number(p.amount), status: p.status, mode: p.paymentMode, remarks: p.remarks, date: p.paymentDate })) }));
  console.log("\nCANDIDATES:\n" + JSON.stringify(candidates, null, 2));
}

main().finally(() => prisma.$disconnect().then(() => pool.end()));