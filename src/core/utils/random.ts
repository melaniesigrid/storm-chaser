/**
 * A seeded pseudo-random generator.
 *
 * Decorative layers, the starfield and the confetti burst, need a scatter that
 * looks arbitrary but is not actually random. `Math.random()` called during
 * render is an impure read: React is free to render a component twice and throw
 * one result away, so a field built that way can reshuffle between a render and
 * the frame the user sees. The React Compiler rejects it for exactly that
 * reason, and it is right to.
 *
 * A seed makes the scatter a pure function of its inputs. The sky is the same
 * on every render and every launch, which is also what a sky should be.
 *
 * Mulberry32: one word of state, a good enough distribution for placing dots,
 * and no dependency. Not for anything that needs to be unguessable.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296;
  };
}
