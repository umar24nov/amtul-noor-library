import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Clears the login rate limiter. Run this if you are ever locked out of the
 * deployed site and cannot reach the database any other way:
 *   npm run clear-lockout
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const before = await prisma.loginAttempt.count();
  const deleted = await prisma.loginAttempt.deleteMany({});
  console.log(
    `rows before: ${before}, deleted: ${deleted.count}, rows now: ${await prisma.loginAttempt.count()}`,
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
