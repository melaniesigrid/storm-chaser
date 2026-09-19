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

/**
 * The launch grew a second act -- a flash and then rain -- and the whole
 * defence of that is that it grew INTO time the overlay was already spending.
 * These are the tests that fail the moment someone buys the weather a beat of
 * its own.
 */
describe('the launch weather', () => {
  it.each(LANGUAGES)('costs %s nothing it was not already spending', (language) => {
    const timing = launchTiming(language, false);
    const mark = Math.max(timing.plateMs, timing.strike.delayMs + timing.strike.durationMs);

    // The rain starts when the mark lands and ends when the overlay does.
    expect(timing.weather.rainAtMs).toBe(mark);
    expect(timing.weather.rainAtMs + timing.weather.rainMs).toBe(timing.totalMs);
    expect(timing.totalMs).toBeLessThanOrEqual(LAUNCH_CEILING_MS);
  });

  it.each(LANGUAGES)('does not light the sky before the bolt lands on %s', (language) => {
    const { weather, strike } = launchTiming(language, false);

    expect(weather.flashAtMs).toBe(strike.delayMs + strike.durationMs);
    expect(weather.flashMs).toBeGreaterThan(0);
  });

  it.each(LANGUAGES)('is dark again before the curtain moves on %s', (language) => {
    const timing = launchTiming(language, false);

    // A bloom still decaying while the overlay cross-fades reads as the screen
    // dimming rather than as lightning.
    expect(timing.weather.flashMs).toBeLessThanOrEqual(timing.holdMs);
  });

  it.each(LANGUAGES)('brings the cloud in before the rain on %s', (language) => {
    const { weather } = launchTiming(language, false);

    // The order is the whole point: drops out of an empty sky are a particle
    // effect, drops out of a cloud are weather.
    expect(weather.cloudAtMs).toBeLessThan(weather.rainAtMs);
    // And it is still overhead when the rain starts.
    expect(weather.cloudAtMs + weather.cloudMs).toBeGreaterThanOrEqual(weather.rainAtMs);
  });

  it('rolls the cloud in even where the theme cuts', () => {
    // Broadcast strikes in 140ms. A cloud that arrives that fast has not
    // rolled in, it has appeared -- the cut is the bolt's language, not the
    // sky's.
    const broadcast = launchTiming('broadcast', false).weather;
    expect(broadcast.cloudMs).toBeGreaterThan(launchTiming('broadcast', false).strike.durationMs);
  });

  it.each(LANGUAGES)('has no weather at all under reduced motion on %s', (language) => {
    const { weather } = launchTiming(language, true);

    // A bloom is a brightness change, a drop is travel, and a cloud is both.
    // All three are exactly what the setting asked not to see.
    expect(weather).toEqual({
      cloudAtMs: 0,
      cloudMs: 0,
      flashAtMs: 0,
      flashMs: 0,
      rainAtMs: 0,
      rainMs: 0,
    });
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
