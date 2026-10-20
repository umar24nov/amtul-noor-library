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
 * Reads the first bytes of a file and returns its real type, or null when they
 * match none of the accepted kinds.
 *
 * The extension and the browser's `file.type` are both supplied by the client,
 * so a file can claim to be a JPG while holding anything at all. The leading
 * bytes ("magic numbers") are written by whatever produced the file and are far
 * harder to fake than a name, so they are what we trust before storing a scan.
 * The signatures: JPEG starts FF D8 FF, PNG starts 89 50 4E 47, and PDF starts
 * "%PDF" (25 50 44 46).
 */
function sniffType(bytes: Uint8Array): "jpg" | "png" | "pdf" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "pdf";
  }
  return null;
}

/** Whether a sniffed kind matches the extension the file arrived under. jpeg and
 *  jpg are the same picture, so either extension accepts a JPEG. */
function kindMatchesExtension(kind: "jpg" | "png" | "pdf", extension: string): boolean {
  if (kind === "jpg") return extension === "jpg" || extension === "jpeg";
  return kind === extension;
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

  // The name is a claim, the leading bytes are the file really being what it
  // says. Reject anything whose contents do not match an accepted kind, so a
  // renamed script cannot be stored and later served from the blob store.
  const kind = sniffType(bytes);
  if (!kind || !kindMatchesExtension(kind, extension)) {
    return { ok: false, message: "That file is not a real JPG, PNG or PDF. Please upload the scan again." };
  }

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