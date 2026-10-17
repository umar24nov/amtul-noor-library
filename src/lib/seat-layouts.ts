/**
 * Vector layouts for the reading-room seat maps.
 *
 * These are transcribed from the two design files the owner supplied
 * (`room 1.svg` and `room 2.svg`), which share a 900x650 viewBox. Keeping the
 * geometry here as plain data, rather than as two large SVG files, lets the
 * same map be rendered with live seat status on the landing page and used as
 * an interactive picker on the join form.
 *
 * Seats are keyed by the number printed on them (1-22). The database stores the
 * same number, zero-padded ("01".."22"), so callers map between the two with
 * `Number(seatNumber)`.
 *
 * Both rooms share one set of desk positions (the tidier Room 2 drawing) and
 * differ only in the number printed on each desk. Keeping a single grid of
 * `CELLS` and renumbering it per room means the two maps can never drift apart
 * in shape, which is what the owner asked for: "same layout, different numbers".
 */

/** Gap between the edge of a desk and the seat drawn on top of it. Narrow, so
 *  the seat fills most of its desk and reads clearly on a small screen. */
export const SEAT_INSET = 4;

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
  /** Human-readable room name this layout was drawn for. */
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

const DOOR_ROOM_1: DoorSpec = {
  line: [410, 560, 490, 560],
  arc: "M 450 560 A 40 40 0 0 1 410 520",
  label: "Door",
  labelX: 450,
  labelY: 580,
};

const DOOR_ROOM_2: DoorSpec = {
  line: [390, 560, 510, 560],
  arc: "M 450 560 A 40 40 0 0 1 390 520",
  label: "Door",
  labelX: 450,
  labelY: 583,
};

/**
 * The desk grid both rooms are drawn from, in a fixed order: the top row of
 * six, the left column of six, then the two middle columns of five each. The
 * coordinates are the Room 2 drawing, which the owner preferred because the
 * desks line up with each other instead of hugging the walls.
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

/**
 * Which number sits on each cell, read off the two design files. The rooms have
 * the same shape but their own numbering, so each list is a full permutation of
 * 1-22 in cell order. Room 2 runs the top row and left column the other way
 * round, which is the only visible difference between the two maps.
 */
const ROOM_1_NUMBERS = [
  // Top row, right to left: 16..11.
  16, 15, 14, 13, 12, 11,
  // Left column, top to bottom: 17..22.
  17, 18, 19, 20, 21, 22,
  // Middle block, left sub-column, bottom to top: 1..5.
  5, 4, 3, 2, 1,
  // Middle block, right sub-column, bottom to top: 6..10.
  10, 9, 8, 7, 6,
];

const ROOM_2_NUMBERS = [
  // Top row, left to right: 17..22.
  17, 18, 19, 20, 21, 22,
  // Left column, top to bottom: 6..1.
  6, 5, 4, 3, 2, 1,
  // Middle block, left sub-column, top to bottom: 11..7.
  11, 10, 9, 8, 7,
  // Middle block, right sub-column, top to bottom: 16..12.
  16, 15, 14, 13, 12,
];

function placements(numbers: number[]): SeatPlacement[] {
  return numbers.map((number, index) => ({ number, ...CELLS[index] }));
}

const ROOM_1 = buildLayout("room-1", "Room 1", [], DOOR_ROOM_1, placements(ROOM_1_NUMBERS));
const ROOM_2 = buildLayout("room-2", "Room 2", [], DOOR_ROOM_2, placements(ROOM_2_NUMBERS));

export const SEAT_LAYOUTS: Record<string, SeatLayout> = {
  [ROOM_1.key]: ROOM_1,
  [ROOM_2.key]: ROOM_2,
};

export type SeatLayoutKey = keyof typeof SEAT_LAYOUTS;

/**
 * Picks the drawing that matches a room, based on its name.
 *
 * The owner creates rooms by name in "Manage seats", and the two designs are
 * literally "Room 1" and "Room 2", so a name match is the least surprising
 * rule. A room whose name matches neither gets no layout, and callers fall back
 * to a plain list of seats rather than showing a map that would be wrong.
 */
export function layoutKeyForRoom(name: string): SeatLayoutKey | null {
  const normalised = name.toLowerCase();
  if (/\b2\b/.test(normalised)) return "room-2";
  if (/\b1\b/.test(normalised)) return "room-1";
  return null;
}

export function layoutForRoom(name: string): SeatLayout | null {
  const key = layoutKeyForRoom(name);
  return key ? SEAT_LAYOUTS[key] : null;
}
