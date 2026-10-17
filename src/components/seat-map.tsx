"use client";

import { type KeyboardEvent } from "react";
import { cn } from "cn";
import type { SeatLayout } from "@/lib/seat-layouts";

export type SeatMapSeat = {
  number: number;
  status: "AVAILABLE" | "OCCUPIED";
};

type SeatMapProps = {
  layout: SeatLayout;
  /** The seats that actually exist in the database, keyed by printed number. */
  seats: SeatMapSeat[];
  /** The currently chosen seat, highlighted in green. */
  selectedNumber?: number | null;
  /** Called when a free seat is tapped. Makes the map an interactive picker. */
  onSelectSeat?: (number: number) => void;
  /**
   * When there is no `onSelectSeat`, a free seat instead links here. Use
   * `{seat}` for the printed seat number, e.g. `/join?room=3&seat={seat}`.
   */
  seatHrefTemplate?: string;
  disabled?: boolean;
  className?: string;
  /** Describes the whole map to assistive technology. */
  ariaLabel?: string;
};

/**
 * Seat fills. Free is green, taken is a quiet grey, and the visitor's pick is
 * blue — deliberately not red, so a taken seat reads as "unavailable" rather
 * than as an error. The room, desks and empty seats are drawn from `foreground`
 * at low opacity, which means the whole drawing follows the light/dark theme
 * without a second palette.
 */
const SEAT_FILL = {
  available: "fill-emerald-500",
  selected: "fill-blue-600",
  occupied: "fill-muted-foreground/40",
  missing: "fill-foreground/10",
} as const;

function seatFill(
  status: "AVAILABLE" | "OCCUPIED" | "MISSING",
  selected: boolean,
): string {
  if (status === "MISSING") return SEAT_FILL.missing;
  if (selected) return SEAT_FILL.selected;
  return status === "AVAILABLE" ? SEAT_FILL.available : SEAT_FILL.occupied;
}

/**
 * The reading-room seat map.
 *
 * One component covers both jobs it has in the app: on the landing page a free
 * seat is a link to the join form with that seat pre-filled, and on the join
 * form it is the picker itself. The drawing comes from `seat-layouts.ts`; only
 * the number and whether a seat is free are read, so nothing about who sits
 * where is ever exposed.
 */
export function SeatMap({
  layout,
  seats,
  selectedNumber = null,
  onSelectSeat,
  seatHrefTemplate,
  disabled = false,
  className,
  ariaLabel = "Seat map",
}: SeatMapProps) {
  const byNumber = new Map(seats.map((seat) => [seat.number, seat.status]));

  return (
    <svg
      viewBox="40 28 820 572"
      role="group"
      aria-label={ariaLabel}
      className={cn("h-auto w-full", className)}
    >
      {/* Room shell: a tinted floor inside a solid wall. */}
      <rect
        x="50"
        y="40"
        width="800"
        height="520"
        rx="14"
        className="fill-foreground/5 stroke-foreground/25"
        strokeWidth={4}
      />

      {/* The room's name, centred across the top of the drawing. */}
      <text
        x="450"
        y="75"
        textAnchor="middle"
        fontSize={22}
        fontWeight={700}
        className="fill-foreground/70"
      >
        {layout.label}
      </text>

      {layout.windows.map((w) => (
        <rect
          key={`w-${w.x}-${w.y}`}
          x={w.x}
          y={w.y}
          width={w.w}
          height={w.h}
          rx="2"
          className="fill-foreground/20"
        />
      ))}

      {/* Door threshold and swing. */}
      <path
        d={`M ${layout.door.line[0]} ${layout.door.line[1]} L ${layout.door.line[2]} ${layout.door.line[3]}`}
        className="stroke-foreground/40"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path
        d={layout.door.arc}
        fill="none"
        className="stroke-foreground/25"
        strokeDasharray="4 4"
        strokeWidth={2}
      />
      <text
        x={layout.door.labelX}
        y={layout.door.labelY}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        className="fill-muted-foreground"
      >
        {layout.door.label}
      </text>

      {layout.desks.map((desk) => (
        <rect
          key={`desk-${desk.x}-${desk.y}`}
          x={desk.x}
          y={desk.y}
          width={desk.w}
          height={desk.h}
          rx="6"
          className="fill-foreground/[0.07] stroke-foreground/15"
          strokeWidth={1.5}
        />
      ))}

      {layout.seats.map((seat) => {
        const status = byNumber.get(seat.number) ?? "MISSING";
        const isSelected = seat.number === selectedNumber;
        const interactive =
          !disabled &&
          status === "AVAILABLE" &&
          (Boolean(onSelectSeat) || Boolean(seatHrefTemplate));
        const fill = seatFill(status, isSelected);
        const label = `Seat ${seat.number} — ${
          status === "MISSING"
            ? "not available"
            : status === "AVAILABLE"
              ? "free"
              : "occupied"
        }${isSelected ? ", selected" : ""}`;

        const rect = (
          <rect
            x={seat.x}
            y={seat.y}
            width={seat.w}
            height={seat.h}
            rx="5"
            className={cn(
              fill,
              interactive && "transition-opacity hover:opacity-85",
            )}
          />
        );
        const text = (
          <text
            x={seat.x + seat.w / 2}
            y={seat.y + seat.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={17}
            fontWeight={700}
            pointerEvents="none"
            className={
              status === "MISSING"
                ? "fill-muted-foreground"
                : status === "OCCUPIED"
                  ? "fill-foreground"
                  : "fill-white"
            }
          >
            {seat.number}
          </text>
        );

        const onKeyDown = onSelectSeat
          ? (event: KeyboardEvent<SVGGElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectSeat(seat.number);
              }
            }
          : undefined;

        const content = (
          <>
            <title>{label}</title>
            {rect}
            {text}
          </>
        );

        if (interactive && seatHrefTemplate) {
          return (
            <a
              key={seat.number}
              href={seatHrefTemplate.replace("{seat}", String(seat.number))}
              aria-label={`${label}. Tap to apply for this seat.`}
              className="cursor-pointer"
            >
              {content}
            </a>
          );
        }

        if (interactive && onSelectSeat) {
          return (
            <g
              key={seat.number}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onSelectSeat(seat.number)}
              onKeyDown={onKeyDown}
              className="cursor-pointer outline-none focus-visible:opacity-70"
            >
              {content}
            </g>
          );
        }

        return <g key={seat.number}>{content}</g>;
      })}
    </svg>
  );
}
