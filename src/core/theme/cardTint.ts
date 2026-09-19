/**
 * Which card stock a card is printed on.
 *
 * Chosen from a stable name rather than from a position in a list: a report
 * passes its id, and a fixed panel passes its `tone`. Either way the card
 * keeps its colour when the column around it is filtered, reordered or added
 * to. An index-based choice would repaint every card above a new report the
 * moment it was saved, and every panel below a banner the moment it appeared.
 *
 * The hash is FNV-1a: a few lines, no dependency, and evenly spread over a
 * palette of twelve, which is all that is being asked of it here. It is not a
 * stable hash across implementations and does not need to be -- nothing is
 * persisted, and `theme.test.ts` pins the one arrangement that matters, the
 * six tones of the Conditions column landing on six different stocks.
 */
export function cardTint(id: string, tints: readonly string[] | undefined): string | undefined {
  if (!tints || tints.length === 0) return undefined;
  return tints[hash(id) % tints.length];
}

function hash(value: string): number {
  let result = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    // The FNV prime, applied with shifts so the maths stays inside 32 bits.
    result = (result + ((result << 1) + (result << 4) + (result << 7) + (result << 8) + (result << 24))) >>> 0;
  }

  return result >>> 0;
}
