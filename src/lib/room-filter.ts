/**
 * The `?room=` filter, shared by every page that offers it.
 *
 * A member sits in a room through their seat, so a room is a nested filter on
 * the seat rather than a column on the member. Members who are not sitting
 * anywhere are a real group too, hence the `NONE` case.
 */

/** Sentinel for members who are not sitting in any seat. */
export const NO_SEAT = "NONE";

export type RoomFilter = number | typeof NO_SEAT | undefined;

type RoomLike = { id: number; name: string };

/**
 * Turns the `?room=` value into a filter. Anything that is not a live room id
 * falls back to undefined, meaning "All rooms".
 *
 * The room list is checked first so a stale link, a deleted room or a
 * hand-edited URL falls back to "All rooms" instead of showing an empty table
 * next to a dropdown that claims something else.
 */
export function parseRoomFilter(
  raw: string | undefined,
  rooms: { id: number }[],
  { allowNoSeat = true }: { allowNoSeat?: boolean } = {},
): RoomFilter {
  if (allowNoSeat && raw === NO_SEAT) return NO_SEAT;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return undefined;
  return rooms.some((room) => room.id === id) ? id : undefined;
}

/** The value to put back in the URL for a given filter. */
export function roomFilterValue(room: RoomFilter): string {
  return room === NO_SEAT ? NO_SEAT : room !== undefined ? String(room) : "ALL";
}

/** Dropdown options for a room filter. */
export function roomFilterOptions(
  rooms: RoomLike[],
  { allowNoSeat = true }: { allowNoSeat?: boolean } = {},
): { value: string; label: string }[] {
  return [
    { value: "ALL", label: "All rooms" },
    ...rooms.map((room) => ({ value: String(room.id), label: room.name })),
    ...(allowNoSeat ? [{ value: NO_SEAT, label: "No seat" }] : []),
  ];
}

/**
 * Prisma condition for members in a given room.
 *
 * `undefined` means no room filter at all. A specific room excludes members
 * without a seat, which is correct: they are not in that room.
 */
export function memberRoomWhere(room: RoomFilter) {
  if (room === NO_SEAT) return { seatId: null };
  if (room !== undefined) return { seat: { roomId: room } };
  return {};
}

/**
 * Prisma condition for seats in a given room. Members with no seat have no seats
 * at all, so the NONE filter has nothing to match here.
 */
export function seatRoomWhere(room: RoomFilter) {
  return room !== undefined && room !== NO_SEAT ? { roomId: room } : {};
}