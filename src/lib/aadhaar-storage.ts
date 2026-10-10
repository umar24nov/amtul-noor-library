import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Extensions the join form accepts, and the maximum size of one scan. */
export const AADHAAR_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"] as const;
export const AADHAAR_MAX_BYTES = 3 * 1024 * 1024;

export type AadhaarSide = "front" | "back";

/** The extension of an uploaded file, when it is one the form accepts. */
function acceptedExtension(file: File): string | null {
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = name.slice(dot + 1);
  return AADHAAR_EXTENSIONS.includes(extension as (typeof AADHAAR_EXTENSIONS)[number])
    ? extension
    : null;
}

/**
 * Saves one Aadhaar scan and returns its URL so the application row can point
 * at it.
 *
 * In production the file goes to Vercel Blob (public, so the admin page can
 * show it in a plain <img> or <embed>). A connected project can authenticate
 * two ways: with the static `BLOB_READ_WRITE_TOKEN`, or through OIDC when the
 * store id is present (`BLOB_STORE_ID`, paired with `VERCEL_OIDC_TOKEN` which
 * the SDK reads by itself). Blob is used whenever either is available; only a
 * local machine with no store connection falls back to writing under `public/`
 * where the dev server can serve the file directly.
 */
export async function storeAadhaarFile(
  file: File,
  side: AadhaarSide,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const extension = acceptedExtension(file);
  if (!extension) {
    return { ok: false, message: "Only JPG, PNG or PDF scans are accepted." };
  }
  if (file.size <= 0 || file.size > AADHAAR_MAX_BYTES) {
    return { ok: false, message: `Each scan must be under ${AADHAAR_MAX_BYTES / 1024 / 1024} MB.` };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${side}.${extension}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  if (token || storeId) {
    // Only pass the static token when we actually have one; with OIDC the SDK
    // reads VERCEL_OIDC_TOKEN itself, and an explicit token (a missing one
    // included) would override that resolution.
    const blob = await put(`aadhaar/${filename}`, bytes, {
      access: "public",
      ...(token ? { token } : {}),
      contentType: file.type || undefined,
    });
    return { ok: true, url: blob.url };
  }

  // Dev fallback: `public/` is served as static assets by the dev server.
  const directory = path.join(process.cwd(), "public", "uploads", "aadhaar");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);
  return { ok: true, url: `/uploads/aadhaar/${filename}` };
}