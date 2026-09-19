import {
  LAUNCH_CEILING_MS,
  launchTiming,
  strikeTiming,
  type MotionLanguage,
} from '@/core/brand/launchSequence';

const LANGUAGES: readonly MotionLanguage[] = ['atmospheric', 'mechanical', 'broadcast'];

/**
 * The launch animation's only real risk is that it stops being an animation
 * and becomes a wait. These are the tests that would fail if someone added a
 * beat here and a beat there until the mark cost a second and a half of
 * someone else's morning, every single time they opened the app.
 */
describe('launchTiming', () => {
  it.each(LANGUAGES)('stays under the ceiling for %s', (language) => {
    expect(launchTiming(language, false).totalMs).toBeLessThanOrEqual(LAUNCH_CEILING_MS);
  });

  it.each(LANGUAGES)('accounts for every phase of %s', (language) => {
    const timing = launchTiming(language, false);
    const mark = Math.max(timing.plateMs, timing.strike.delayMs + timing.strike.durationMs);

    // The plate and the bolt overlap, so the total is the later of the two
    // plus what follows -- never the sum of all four.
    expect(timing.totalMs).toBe(mark + timing.holdMs + timing.fadeMs);
    expect(timing.totalMs).toBeGreaterThan(0);
  });

  it('cuts rather than eases on broadcast', () => {
    const timing = launchTiming('broadcast', false);

    // A bulletin does not fade up into the next lower third, and the mark must
    // not either: no approach and no exit, just the frame before and the frame
    // after.
    expect(timing.plateMs).toBe(0);
    expect(timing.fadeMs).toBe(0);
  });

  it('travels further on atmospheric than on mechanical', () => {
    // A stamp lands; weather arrives. If these two ever converge, the themes
    // have quietly gone back to being one design with three palettes.
    expect(launchTiming('atmospheric', false).strike.durationMs).toBeGreaterThan(
      launchTiming('mechanical', false).strike.durationMs,
    );
  });

  it.each(LANGUAGES)('holds still under reduced motion on %s', (language) => {
    const timing = launchTiming(language, true);

    // Stillness, not absence: nothing travels, the mark still gets its beat,
    // and the overlay leaves on the one transition the setting permits.
    expect(timing.plateMs).toBe(0);
    expect(timing.strike.delayMs).toBe(0);
    expect(timing.strike.durationMs).toBe(0);
    expect(timing.holdMs).toBeGreaterThan(0);
    expect(timing.fadeMs).toBeGreaterThan(0);
    expect(timing.totalMs).toBeLessThanOrEqual(LAUNCH_CEILING_MS);
  });

  it('is identical across themes under reduced motion', () => {
    const [first, ...rest] = LANGUAGES.map((language) => launchTiming(language, true));

    // Reduced motion is a floor, not a style: no theme gets to be the slightly
    // livelier one once someone has asked the OS to stop.
    for (const timing of rest) expect(timing).toEqual(first);
  });
});

describe('strikeTiming', () => {
  it.each(LANGUAGES)('matches the launch strike for %s', (language) => {
    // The mark in a tab header and the mark on the launch overlay are the same
    // gesture at two sizes. One source, so they cannot drift apart.
    expect(strikeTiming(language, false)).toEqual(launchTiming(language, false).strike);
  });

  it.each(LANGUAGES)('is instant under reduced motion on %s', (language) => {
    expect(strikeTiming(language, true)).toEqual({ delayMs: 0, durationMs: 0 });
  });
});
