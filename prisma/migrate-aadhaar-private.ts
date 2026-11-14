/**
 * Copies Aadhaar scans that were stored in the old public Blob store into the
 * private store, and rewrites each application row to the new blob pathname.
 *
 * Vercel Blob fixes a store's access mode when it is created, so a public
 * store cannot be made private in place. The steps are:
 *
 *   1. Create a private Blob store in Vercel and connect it to the project.
 *   2. Run this script with credentials for that store.
 *   3. Delete the old public store (it only holds Aadhaar scans) once the
 *      script reports no failures.
 *
 *   npm run migrate-aadhaar-private -- --dry   # list what would move
 *   npm run migrate-aadhaar-private            # copy + update rows
 *
 * The script is safe to re-run: rows that already hold a private pathname are
 * skipped.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const MAX_BYTES = 3 * 1024 * 1024;
const EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

/** Same credential order as the app (see src/lib/aadhaar-storage.ts). */
function credentials(): { token?: string; storeId?: string } {
  const token = process.env.AADHAAR_BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };

  const storeId = process.env.AADHAAR_BLOB_STORE_ID?.trim();
  if (storeId) return { storeId };

  // Let the SDK use the project's connected store (OIDC via BLOB_STORE_ID,
  // then BLOB_READ_WRITE_TOKEN).
  return {};
}

function hasBlobCredentials(): boolean {
  return Boolean(
    process.env.AADHAAR_BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.AADHAAR_BLOB_STORE_ID?.trim() ||
      process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.BLOB_STORE_ID?.trim(),
  );
}

function extensionFrom(stored: string): string | null {
  const clean = stored.split("?")[0].split("#")[0];
  const extension = clean.slice(clean.lastIndexOf(".") + 1).toLowerCase();
  return EXTENSIONS.has(extension) ? extension : null;
}

function extensionFor(contentType: string | null | undefined): string | null {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  return null;
}

/** Reads the bytes from a legacy public URL or the local dev fallback. */
async function readStored(
  stored: string,
): Promise<{ bytes: Buffer; contentType?: string } | null> {
  if (/^https?:\/\//i.test(stored)) {
    const response = await fetch(stored);
    if (!response.ok) {
      throw new Error(`the old public URL returned HTTP ${response.status}`);
    }

    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > MAX_BYTES) {
      throw new Error(`the scan is ${declared} bytes, above the ${MAX_BYTES} cap`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      throw new Error(`the scan is ${bytes.length} bytes, above the ${MAX_BYTES} cap`);
    }

    return { bytes, contentType: response.headers.get("content-type") ?? undefined };
  }

  if (stored.startsWith("/uploads/")) {
    // A local development fallback (`public/uploads/aadhaar/...`).
    const file = path.join(process.cwd(), "public", ...stored.split("/").filter(Boolean));
    return { bytes: await readFile(file) };
  }

  return null;
}

async function main() {
  const dry = process.argv.includes("--dry");

  if ((process.env.AADHAAR_BLOB_ACCESS?.trim() || "private").toLowerCase() === "public") {
    console.error(
      "AADHAAR_BLOB_ACCESS is public. Set it to private (or remove it) before migrating.",
    );
    process.exit(1);
  }

  if (!dry && !hasBlobCredentials()) {
    console.error(
      "No Blob credentials found. Run `vercel env pull` for the connected store, or set AADHAAR_BLOB_READ_WRITE_TOKEN / BLOB_READ_WRITE_TOKEN.",
    );
    process.exit(1);
  }

  const applications = await prisma.application.findMany({
    where: {
      OR: [
        { aadhaarFrontUrl: { startsWith: "http" } },
        { aadhaarBackUrl: { startsWith: "http" } },
        { aadhaarFrontUrl: { startsWith: "/uploads/" } },
        { aadhaarBackUrl: { startsWith: "/uploads/" } },
      ],
    },
    select: { id: true, name: true, aadhaarFrontUrl: true, aadhaarBackUrl: true },
    orderBy: { id: "asc" },
  });

  if (applications.length === 0) {
    console.log(
      "Nothing to migrate: every stored scan is already a private pathname (or missing).",
    );
    return;
  }

  console.log(`Found ${applications.length} application(s) with a public scan.`);
  let moved = 0;
  let failed = 0;

  for (const application of applications) {
    const sides = [
      { side: "front" as const, stored: application.aadhaarFrontUrl },
      { side: "back" as const, stored: application.aadhaarBackUrl },
    ];

    for (const { side, stored } of sides) {
      if (!stored) continue;
      if (!/^https?:\/\//i.test(stored) && !stored.startsWith("/uploads/")) continue;

      const label = `${application.name} (#${application.id}) ${side}`;
      try {
        const payload = await readStored(stored);
        if (!payload) continue;

        const extension = extensionFrom(stored) ?? extensionFor(payload.contentType);
        if (!extension) {
          throw new Error("could not tell whether it is a JPG, PNG or PDF");
        }

        const pathname = `aadhaar/${application.id}-${side}-${Date.now()}.${extension}`;

        if (dry) {
          console.log(`  would move ${label} -> ${pathname}`);
          moved += 1;
          continue;
        }

        const blob = await put(pathname, payload.bytes, {
          access: "private",
          ...credentials(),
          contentType: payload.contentType,
        });

        await prisma.application.update({
          where: { id: application.id },
          data:
            side === "front"
              ? { aadhaarFrontUrl: blob.pathname }
              : { aadhaarBackUrl: blob.pathname },
        });

        console.log(`  moved ${label} -> ${blob.pathname}`);
        moved += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `  could not move ${label}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  if (dry) {
    console.log(`\nDry run: ${moved} scan(s) would move; nothing was changed.`);
  } else {
    console.log(`\nMoved ${moved} scan(s); ${failed} failed.`);
  }

  if (failed > 0) process.exitCode = 1;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
