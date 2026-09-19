/**
 * One clamp for the whole app.
 *
 * Three copies of this had grown independently: an inline 0..1 clamp in the
 * chart geometry, a private helper scoring the chase index, and a latitude
 * guard in the community sample. They were identical in mechanics and differed
 * only in bounds, so the bounds stay at the call sites and the mechanic lives
 * here.
 *
 * Deliberately not defensive about NaN: callers that care (see `normalise`)
 * check finiteness themselves, and silently substituting a number here would
 * hide bad readings rather than surface them.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
