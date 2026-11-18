/**
 * Vector layouts for the seat maps.
 *
 * These are transcribed from the seat-plan designs the owner supplied, which
 * share a 900x650 viewBox. Keeping the geometry here as plain data, rather than
 * as large SVG files, lets the same map be rendered with live seat status on the
 * landing page and used as an interactive picker on the join form.
 *
 * Seats are keyed by their plain printed number, 1-44. The database stores the
 * same number as a string, so callers use `Number(seat.seatNumber)`. Numbers
 * 1-22 are the plain layout and 23-44 are the locker layout; both use the same
 * desk positions, with the locker map renumbered from the second drawing.
 */

/** Gap between the edge of a desk and the seat drawn on top of it. Zero, so the
 *  seat fills its desk box exactly and reads as large as the box allows on a
 *  phone. The box itself is unchanged — only the seat inside it grows. */
export const SEAT_INSET = 0;

export type Rect = { x: number; y: number; w: number; h: number };

/** A desk rectangle with the seat number that belongs to it. */
export type SeatPlacement = Rect & { number: number };

export type DoorSpec = {
  /** Straight threshold line: x1, y1, x2, y2. */
  line: [number, number, number, number];
  /** Dashed swing arc path. */
  arc: string;
  label: string;
  labelX: number;
  labelY: number;
};

export type SeatLayout = {
  key: string;
  /** Human-readable label for this group of seats. */
  label: string;
  windows: Rect[];
  door: DoorSpec;
  /** Desk rectangles (the seat sits inset inside each desk). */
  desks: Rect[];
  /** Seat rectangles, already inset, with the number they carry. */
  seats: SeatPlacement[];
};

function buildLayout(
  key: string,
  label: string,
  windows: Rect[],
  door: DoorSpec,
  placements: SeatPlacement[],
): SeatLayout {
  return {
    key,
    label,
    windows,
    door,
    desks: placements.map(({ x, y, w, h }) => ({ x, y, w, h })),
    seats: placements.map(({ number, x, y, w, h }) => ({
      number,
      x: x + SEAT_INSET,
      y: y + SEAT_INSET,
      w: w - SEAT_INSET * 2,
      h: h - SEAT_INSET * 2,
    })),
  };
}

const DOOR_STANDARD: DoorSpec = {
  line: [410, 560, 490, 560],
  arc: "M 450 560 A 40 40 0 0 1 410 520",
  label: "Door",
  labelX: 450,
  labelY: 580,
};

const DOOR_LOCKER: DoorSpec = {
  line: [390, 560, 510, 560],
  arc: "M 450 560 A 40 40 0 0 1 390 520",
  label: "Door",
  labelX: 450,
  labelY: 583,
};

/**
 * One desk grid in a fixed order: the top row of six, the left column of six,
 * then the two middle columns of five each. The coordinates come from the
 * tidier of the two drawings, whose desks line up with each other instead of
 * hugging the walls.
 */
const CELLS: Rect[] = [
  // Top row.
  { x: 145, y: 95, w: 60, h: 50 },
  { x: 250, y: 95, w: 60, h: 50 },
  { x: 355, y: 95, w: 60, h: 50 },
  { x: 460, y: 95, w: 60, h: 50 },
  { x: 565, y: 95, w: 60, h: 50 },
  { x: 670, y: 95, w: 60, h: 50 },
  // Left column.
  { x: 145, y: 175, w: 50, h: 50 },
  { x: 145, y: 230, w: 50, h: 50 },
  { x: 145, y: 285, w: 50, h: 50 },
  { x: 145, y: 340, w: 50, h: 50 },
  { x: 145, y: 395, w: 50, h: 50 },
  { x: 145, y: 450, w: 50, h: 50 },
  // Middle block, left sub-column.
  { x: 390, y: 175, w: 50, h: 50 },
  { x: 390, y: 230, w: 50, h: 50 },
  { x: 390, y: 285, w: 50, h: 50 },
  { x: 390, y: 340, w: 50, h: 50 },
  { x: 390, y: 395, w: 50, h: 50 },
  // Middle block, right sub-column.
  { x: 450, y: 175, w: 50, h: 50 },
  { x: 450, y: 230, w: 50, h: 50 },
  { x: 450, y: 285, w: 50, h: 50 },
  { x: 450, y: 340, w: 50, h: 50 },
  { x: 450, y: 395, w: 50, h: 50 },
];

/** Numbering read from the first drawing: 1-22 in cell order. */
const STANDARD_NUMBERS = [
  // Top row, right to left: 16..11.
  16, 15, 14, 13, 12, 11,
  // Left column, top to bottom: 17..22.
  17, 18, 19, 20, 21, 22,
  // Middle block, left sub-column, bottom to top: 1..5.
  5, 4, 3, 2, 1,
  // Middle block, right sub-column, bottom to top: 6..10.
  10, 9, 8, 7, 6,
];

/** The second drawing's numbering, shifted onto seats 23-44. */
const LOCKER_NUMBERS = [
  // Top row, left to right: 39..44.
  39, 40, 41, 42, 43, 44,
  // Left column, top to bottom: 28..23.
  28, 27, 26, 25, 24, 23,
  // Middle block, left sub-column, top to bottom: 33..29.
  33, 32, 31, 30, 29,
  // Middle block, right sub-column, top to bottom: 38..34.
  38, 37, 36, 35, 34,
];

function placements(numbers: number[]): SeatPlacement[] {
  return numbers.map((number, index) => ({ number, ...CELLS[index] }));
}

const PLAIN_LAYOUT = buildLayout(
  "plain",
  "Seats 1–22 · Non-locker",
  [],
  DOOR_STANDARD,
  placements(STANDARD_NUMBERS),
);

const LOCKER_LAYOUT = buildLayout(
  "locker",
  "Seats 23–44 · With locker",
  [],
  DOOR_LOCKER,
  placements(LOCKER_NUMBERS),
);

export const SEAT_LAYOUTS = {
  plain: PLAIN_LAYOUT,
  locker: LOCKER_LAYOUT,
} as const satisfies Record<string, SeatLayout>;

export type SeatLayoutKey = keyof typeof SEAT_LAYOUTS;

/** Locker status is fixed by the number, so the layout follows it directly. */
export function layoutForSeat(hasLocker: boolean): SeatLayout {
  return hasLocker ? SEAT_LAYOUTS.locker : SEAT_LAYOUTS.plain;
}

export function layoutForSeatNumber(seatNumber: number): SeatLayout {
  return layoutForSeat(seatNumber >= 23);
}
