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
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}
