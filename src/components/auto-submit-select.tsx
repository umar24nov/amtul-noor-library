"use client";

import { selectClassName } from "@/components/filters";

/**
 * A filter dropdown that applies itself the moment a choice is made.
 *
 * The filter form is a plain GET form, so the chosen value goes into the URL
 * and the page reloads with the new filter. Choosing a filter should not also
 * mean pressing "Apply".
 *
 * Uncontrolled on purpose: the browser keeps the choice that was made while
 * the page reloads, instead of snapping back to the old value for a frame.
 */
export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  label,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={selectClassName}
      aria-label={label}
      onChange={(event) => {
        event.currentTarget.form?.requestSubmit();
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
