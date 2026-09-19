/**
 * Compile-time exhaustiveness check that does not throw at runtime.
 *
 * A `switch` over a string union with no `default` is checked by the compiler:
 * add a member and every switch that forgot it fails to build. Adding a
 * `default` to make the runtime safe silently throws that guarantee away, and
 * the next storm type ships as a fallback glyph with a green build.
 *
 * Calling this in the default branch keeps both. `value` is `never` only while
 * the cases above are exhaustive, so a new member is still a compile error
 * here, and because the body does nothing, the caller's fallback still runs
 * for a value that was smuggled past the types (a report persisted under an
 * older schema, say).
 */
export function assertNever(_value: never): void {
  // Intentionally empty. See the doc comment: this exists for `tsc`, and the
  // caller returns its fallback on the line below.
}
