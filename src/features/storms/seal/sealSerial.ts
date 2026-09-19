/**
 * A stable serial for a seal, derived from the report's own id.
 *
 * Log position was the obvious choice and it is wrong: delete one report and
 * every seal already shared with a higher serial is retrospectively lying
 * about itself. A seal is an artifact that leaves the device, so its identity
 * has to survive edits to the log it came from.
 *
 * FNV-1a rather than a dependency, matching the habit `createId` already sets.
 * `random.ts` is a seeded PRNG, not a hash, and would give a different answer
 * for the same input on a different call.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Eight hex digits: the whole 32-bit hash, not a truncation of it.
 *
 * The design doc specified six, reasoning that 24 bits pushes a duplicate out
 * to "the low thousands". A test disagreed: seeding two thousand ids produced
 * a collision, which is the birthday bound behaving exactly as it should
 * around 2^12 for a 2^24 space. Truncating a hash to save two glyphs on a
 * stamp is not worth two reports claiming to be the same one, so the serial
 * prints all of it.
 */
const SERIAL_DIGITS = 8;

/**
 * 32-bit FNV-1a over the UTF-16 code units of `value`.
 *
 * `Math.imul` keeps the multiply in 32-bit territory; a plain `*` overflows
 * into float territory at the third character and stops being FNV.
 */
export function fnv1a(value: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // `>>> 0` reads the same bits back as unsigned; imul leaves them signed.
  return hash >>> 0;
}

/**
 * The serial printed on a seal, as six uppercase hex digits.
 *
 * Four digits was the first draft. Sixteen bits means a collision becomes more
 * likely than not somewhere around three hundred reports, and duplicate
 * serials on something whose whole claim is collectibility would undercut the
 * idea. Twenty-four bits moves that to the low thousands, which is past any
 * realistic field log.
 */
export function sealSerial(reportId: string): string {
  return fnv1a(reportId)
    .toString(16)
    .toUpperCase()
    .padStart(SERIAL_DIGITS, '0')
    .slice(-SERIAL_DIGITS);
}
