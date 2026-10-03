"use client";

import { cn } from "cn";
import { useRef } from "react";

/**
 * A native select that lives inside a GET filter form and submits it as soon as
 * the value changes. It has to be a client component because event handlers
 * cannot be passed from a server component.
 */
export function FilterSelect({
  name,
  value,
  options,
  ariaLabel,
  className,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <select
      name={name}
      defaultValue={value}
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      onChange={() => formRef.current?.requestSubmit()}
      ref={(node) => {
        formRef.current = node?.closest("form") ?? null;
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}