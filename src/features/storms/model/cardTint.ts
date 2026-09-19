/**
 * Which card stock a report is printed on.
 *
 * Chosen from the report id rather than from its position in the list, so a
 * card keeps its colour when the list is filtered, reordered or added to. An
 * index-based choice would repaint every card above a new report the moment it
 * was saved.
 *
 * The hash is FNV-1a: a few lines, no dependency, and evenly spread over a
 * palette of six, which is all that is being asked of it here.
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
