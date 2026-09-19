/**
 * The outlook row label: today is named, every other day is its weekday
 * abbreviation.
 *
 * Lives in the model rather than beside the component so it can be unit
 * tested: importing `OutlookList` pulls in the `@/core/ui` barrel, and through
 * it Reanimated, which needs a native runtime the unit suite does not have.
 *
 * The fallback matters more than it looks. A malformed date would otherwise
 * render "Invalid Date" in a 48px column across the whole panel; echoing the
 * raw string keeps the row identifiable and keeps the layout the shape it was
 * designed as.
 */
export function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Today';
  const parsed = parseLocalDate(date);
  if (parsed === null) return date;
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}

/**
 * Parse an Open-Meteo date into the day the reader is standing in.
 *
 * `new Date('2026-09-19')` is specified to parse a date-only form as UTC
 * midnight, so every zone west of UTC lands on the evening before and the whole
 * outlook shifts back a day: Toronto rendered "Fri" on a row that was Saturday,
 * on every row, every day. The forecast rows are calendar days in the user's
 * own zone, not instants, so they have to be built from their components as
 * local midnight.
 *
 * Anything carrying a time (`2026-09-19T00:00`) is already interpreted locally
 * by `Date`, so it goes through untouched.
 */
function parseLocalDate(value: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
