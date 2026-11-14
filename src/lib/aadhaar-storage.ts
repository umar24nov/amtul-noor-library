import { get, put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Extensions the join form accepts, and the maximum size of one scan. */
export const AADHAAR_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"] as const;
export const AADHAAR_MAX_BYTES = 3 * 1024 * 1024;

/** The Blob folder every scan is written under. */
export const AADHAAR_BLOB_PREFIX = "aadhaar/";

/** The same-origin route that streams a private scan to the admin panel. */
export const AADHAAR_SCAN_ROUTE = "/api/aadhaar";

export type AadhaarSide = "front" | "back";

/**
 * Whether new scans go to a private Blob store.
 *
 * Private is the default because an Aadhaar card is sensitive: a private blob
 * has no public URL and can only be read through the checked route below. The
 * escape hatch exists only for the move itself — while the old public store is
 * still the one connected to the project, set `AADHAAR_BLOB_ACCESS=public` so
 * the join form keeps working until the private store is connected.
 */
function blobAccess(): "private" | "public" {
  return process.env.AADHAAR_BLOB_ACCESS?.trim().toLowerCase() === "public"
    ? "public"
    : "private";
}

/**
 * Credentials for the store that holds the scans.
 *
 * Usually the project's connected store is enough: the SDK reads OIDC through
 * `BLOB_STORE_ID` (preferred) or the static `BLOB_READ_WRITE_TOKEN`. The
 * `AADHAAR_BLOB_*` variables exist so a private store can be used while an
 * older public store is still connected to the same project.
 */
function blobCredentials(): { token?: string; storeId?: string } {
  const token = process.env.AADHAAR_BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };

  const storeId = process.env.AADHAAR_BLOB_STORE_ID?.trim();
  if (storeId) return { storeId };

  return {};
}

/** Whether this deployment can reach a Blob store at all. */
function blobConfigured(): boolean {
  return Boolean(
    process.env.AADHAAR_BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.AADHAAR_BLOB_STORE_ID?.trim() ||
      process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      process.env.BLOB_STORE_ID?.trim(),
  );
}

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
 * Saves one Aadhaar scan and returns the value to store on the application.
 *
 * In production the file goes to Vercel Blob. A private store is preferred: the
 * row keeps the blob's pathname (for example `aadhaar/172…-front.jpg`), never a
 * URL, because a private URL is useless without a token and must not be handed
 * to the browser. The admin preview then asks the same-origin `/api/aadhaar`
 * route, which checks the session before reading the file.
 *
 * Public access is kept as a transition mode: it stores the public blob URL so
 * rows written while the old store is still connected keep working.
 *
 * A connected project can authenticate two ways: with the static
 * `BLOB_READ_WRITE_TOKEN`, or through OIDC when the store id is present
 * (`BLOB_STORE_ID`, paired with `VERCEL_OIDC_TOKEN` which the SDK reads by
 * itself). Blob is used whenever either is available; only a local machine with
 * no store connection falls back to writing under `public/` where the dev
 * server can serve the file directly.
 */
export async function storeAadhaarFile(
  file: File,
  side: AadhaarSide,
): Promise<{ ok: true; stored: string } | { ok: false; message: string }> {
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
  const pathname = `${AADHAAR_BLOB_PREFIX}${filename}`;

  if (blobConfigured()) {
    const access = blobAccess();
    try {
      const blob = await put(pathname, bytes, {
        access,
        ...blobCredentials(),
        contentType: file.type || undefined,
      });
      return { ok: true, stored: access === "private" ? blob.pathname : blob.url };
    } catch (error) {
      // Almost always the store is still the old public one: Vercel refuses a
      // private write to a public store. Log the real error, show a plain one.
      console.error("Could not store an Aadhaar scan in Vercel Blob:", error);
      return {
        ok: false,
        message: "Could not save the Aadhaar scan right now. Please try again in a moment.",
      };
    }
  }

  // Dev fallback: `public/` is served as static assets by the dev server.
  const directory = path.join(process.cwd(), "public", "uploads", "aadhaar");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);
  return { ok: true, stored: `/uploads/aadhaar/${filename}` };
}

/**
 * The URL the admin panel should use for a stored scan.
 *
 * Private scans are saved as a pathname (`aadhaar/...`), because their blob URL
 * needs a token and must not be handed to the browser. They are served through
 * the checked route instead. Rows written before the move to a private store
 * still hold a public URL (or a `/uploads/...` path in local development) and
 * are used as they are.
 */
export function aadhaarScanSrc(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (
    stored.startsWith("http://") ||
    stored.startsWith("https://") ||
    stored.startsWith("/")
  ) {
    return stored;
  }

  const filename = stored.startsWith(AADHAAR_BLOB_PREFIX)
    ? stored.slice(AADHAAR_BLOB_PREFIX.length)
    : stored;
  return `${AADHAAR_SCAN_ROUTE}/${encodeURIComponent(filename)}`;
}

/**
 * Reads one private scan for the admin route.
 *
 * Returns null when the blob is missing or the store cannot be reached, so the
 * route can answer 404 without leaking the underlying error. The filename is
 * only ever a generated one (`<timestamp>-<side>.<extension>`), which keeps the
 * route from being used to read anything else in the store.
 */
export async function readAadhaarScan(
  filename: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string; size: number } | null> {
  if (filename.length > 200 || filename.includes("..") || !/^[A-Za-z0-9._-]+$/.test(filename)) {
    return null;
  }
  if (!blobConfigured()) return null;

  try {
    const result = await get(`${AADHAAR_BLOB_PREFIX}${filename}`, {
      access: "private",
      ...blobCredentials(),
    });
    if (!result || result.statusCode !== 200) return null;

    return {
      stream: result.stream,
      contentType: result.blob.contentType,
      size: result.blob.size,
    };
  } catch (error) {
    console.error("Could not read an Aadhaar scan from Vercel Blob:", error);
    return null;
  }
}
