/**
 * How wide the temperature bar in an outlook row may be.
 *
 * Arithmetic, not layout, so it lives here rather than in the component: it is
 * pure, it is the thing that was wrong, and a test can reach it without
 * pulling the `@/core/ui` barrel and Reanimated behind it.
 *
 * The row used to be six fixed-width columns -- day, icon, gust, low, bar,
 * high -- adding up to 408dp inside a panel 326dp wide on a 390pt phone.
 * React Native does not clip an overflowing row, it overlaps it, so the gust
 * printed straight through the low: "37 km/h9°". It is visible in the
 * submission recording, which is how it was found.
 *
 * Two changes fix it, and neither is a smaller font. The gust moved out of the
 * row and under the day label, where it is a caption rather than a column --
 * six things in a row was one too many at phone width whatever the numbers
 * said. And the bar is measured rather than declared: it takes what is left
 * after the fixed columns and the day label's floor, so the row cannot
 * overflow at any width.
 */

/** The weather glyph at the head of the row. */
export const ICON = 34;
/** Each of the two temperature readings flanking the bar. */
export const TEMP_COLUMN = 42;
/**
 * The day column never shrinks past this, however narrow the phone.
 *
 * 60 was the first answer and it was wrong in the other direction: the row
 * stopped overlapping and started truncating, "34 km/h" rendering as "34 km…"
 * on a 390pt phone. The column carries two lines now, and the wider of them is
 * the gust, so it sets the floor rather than the weekday does.
 */
export const DAY_MIN = 80;
export const ROW_GAP = 10;
export const TEMP_GAP = 8;

/** Everything in a row that is neither the bar nor the flexible day column. */
export const ROW_FIXED = ICON + TEMP_COLUMN * 2 + ROW_GAP * 2 + TEMP_GAP * 2;

/**
 * Below 40 a bar stops reading as a bar and starts reading as a dash; above
 * 120 the row is all chart and no numbers on a tablet.
 */
export const BAR_MIN = 40;
export const BAR_MAX = 110;

export function barWidthFor(rowWidth: number): number {
  const available = rowWidth - ROW_FIXED - DAY_MIN;
  return Math.max(BAR_MIN, Math.min(BAR_MAX, available));
}
