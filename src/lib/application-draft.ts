/**
 * A recoverable draft for the public seat application.
 *
 * The Aadhaar number and the scan are deliberately absent: both are sensitive,
 * and browsers cannot restore a file input after a reset anyway. Everything a
 * person types about themselves is kept so one bad field never sends them back
 * to the start.
 */
export const APPLICATION_DRAFT_KEY = "amtul-noor-library:application-draft:v1";

export type ApplicationDraftSeatType = "all" | "non-locker" | "locker";

export type ApplicationDraft = {
  name: string;
  mobile: string;
  email: string;
  address: string;
  guardianName: string;
  guardianMobile: string;
  preparingFor: string;
  joiningDate: string;
  seatId: string;
  seatType: ApplicationDraftSeatType;
  agreed: boolean;
};

export const EMPTY_APPLICATION_DRAFT: ApplicationDraft = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  guardianName: "",
  guardianMobile: "",
  preparingFor: "",
  joiningDate: "",
  seatId: "",
  seatType: "all",
  agreed: false,
};

type DraftTextField = Exclude<keyof ApplicationDraft, "seatType" | "agreed">;

/** Mirrors the validator limits so a stale or hand-edited draft cannot grow unbounded. */
const TEXT_LIMITS: Record<DraftTextField, number> = {
  name: 80,
  mobile: 10,
  email: 120,
  address: 200,
  guardianName: 80,
  guardianMobile: 10,
  preparingFor: 200,
  joiningDate: 10,
  seatId: 10,
};

const TEXT_FIELDS = Object.keys(TEXT_LIMITS) as DraftTextField[];
const SEAT_TYPES: ApplicationDraftSeatType[] = ["all", "non-locker", "locker"];

function cleanText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function cleanSeatType(value: unknown): ApplicationDraftSeatType {
  return typeof value === "string" && SEAT_TYPES.includes(value as ApplicationDraftSeatType)
    ? (value as ApplicationDraftSeatType)
    : "all";
}

/** Reads a draft defensively; anything unexpected falls back to an empty draft. */
export function readApplicationDraft(raw: string | null): ApplicationDraft {
  if (!raw) return { ...EMPTY_APPLICATION_DRAFT };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...EMPTY_APPLICATION_DRAFT };
    }

    const source = parsed as Record<string, unknown>;
    const draft = { ...EMPTY_APPLICATION_DRAFT };
    for (const field of TEXT_FIELDS) {
      draft[field] = cleanText(source[field], TEXT_LIMITS[field]);
    }
    draft.seatType = cleanSeatType(source.seatType);
    draft.agreed = source.agreed === true;
    return draft;
  } catch {
    return { ...EMPTY_APPLICATION_DRAFT };
  }
}

/** Stores only non-sensitive fields, capped to the same limits as the validators. */
export function serializeApplicationDraft(draft: ApplicationDraft): string {
  const stored: ApplicationDraft = { ...EMPTY_APPLICATION_DRAFT };
  for (const field of TEXT_FIELDS) {
    stored[field] = cleanText(draft[field], TEXT_LIMITS[field]);
  }
  stored.seatType = cleanSeatType(draft.seatType);
  stored.agreed = draft.agreed === true;
  return JSON.stringify(stored);
}
