import {
  moonGeometry,
  moonPhase,
  SYNODIC_MONTH_DAYS,
} from '@/core/sky/moonPhase';

/**
 * Reference instants, from published ephemerides (all UTC).
 *
 * These are the assertions that make this file worth having. Anything can
 * produce a number that cycles between 0 and 1 every 29 days; only agreeing
 * with the actual sky tells you the implementation is right. The tolerances
 * are what a low-precision series is honestly good for -- about a degree of
 * phase angle -- not what would make the test pass.
 */
const NEW_MOONS = [
  new Date(Date.UTC(2024, 0, 11, 11, 57)),
  new Date(Date.UTC(2024, 3, 8, 18, 21)),
  new Date(Date.UTC(2025, 0, 29, 12, 36)),
  new Date(Date.UTC(2025, 5, 25, 10, 31)),
];

const FULL_MOONS = [
  new Date(Date.UTC(2024, 0, 25, 17, 54)),
  new Date(Date.UTC(2024, 8, 18, 2, 34)),
  new Date(Date.UTC(2025, 0, 13, 22, 27)),
  new Date(Date.UTC(2025, 6, 10, 20, 37)),
];

describe('moonPhase at known new moons', () => {
  it.each(NEW_MOONS)('is dark at the new moon of %s', (instant) => {
    const phase = moonPhase(instant);
    // Illumination is quadratic in the phase angle near new, so a degree of
    // error is well under a percent of disc.
    expect(phase.illuminated).toBeLessThan(0.01);
    expect(phase.name).toBe('new');
  });
});

describe('moonPhase at known full moons', () => {
  it.each(FULL_MOONS)('is lit at the full moon of %s', (instant) => {
    const phase = moonPhase(instant);
    expect(phase.illuminated).toBeGreaterThan(0.99);
    expect(phase.name).toBe('full');
  });
});

describe('moonPhase direction', () => {
  it('waxes in the week after a new moon', () => {
    const newMoon = NEW_MOONS[0]!;
    const week = new Date(newMoon.getTime() + 7 * 86_400_000);
    const phase = moonPhase(week);
    expect(phase.waxing).toBe(true);
    // Seven days in is the first quarter, give or take the eccentricity that
    // the naive modulo-29.53 version gets wrong.
    expect(phase.illuminated).toBeGreaterThan(0.35);
    expect(phase.illuminated).toBeLessThan(0.65);
  });

  it('wanes in the week after a full moon', () => {
    const full = FULL_MOONS[0]!;
    const week = new Date(full.getTime() + 7 * 86_400_000);
    const phase = moonPhase(week);
    expect(phase.waxing).toBe(false);
    expect(phase.illuminated).toBeGreaterThan(0.35);
    expect(phase.illuminated).toBeLessThan(0.65);
  });

  it('calls the same illumination two different things on either side of full', () => {
    // The reason the name is not derived from illumination alone: these two
    // discs look identical and are a fortnight apart.
    const full = FULL_MOONS[0]!;
    const before = moonPhase(new Date(full.getTime() - 5 * 86_400_000));
    const after = moonPhase(new Date(full.getTime() + 5 * 86_400_000));
    expect(before.illuminated).toBeCloseTo(after.illuminated, 1);
    expect(before.name).toBe('waxing gibbous');
    expect(after.name).toBe('waning gibbous');
  });
});

describe('moonPhase cycle', () => {
  it('returns to new after one synodic month', () => {
    const start = NEW_MOONS[2]!;
    const later = new Date(start.getTime() + SYNODIC_MONTH_DAYS * 86_400_000);
    expect(moonPhase(later).illuminated).toBeLessThan(0.02);
  });

  it('keeps every output in range across a full year of days', () => {
    // A wrap bug in the longitude maths shows up as a negative cycle or an
    // illumination over 1, and it will not show up at the four dates above.
    for (let day = 0; day < 365; day += 1) {
      const phase = moonPhase(new Date(Date.UTC(2026, 0, 1 + day, 3, 0)));
      expect(phase.cycle).toBeGreaterThanOrEqual(0);
      expect(phase.cycle).toBeLessThan(1);
      expect(phase.illuminated).toBeGreaterThanOrEqual(0);
      expect(phase.illuminated).toBeLessThanOrEqual(1);
      expect(phase.ageDays).toBeLessThan(SYNODIC_MONTH_DAYS);
      expect(Number.isNaN(phase.illuminated)).toBe(false);
    }
  });

  it('passes through all eight phase names over a month', () => {
    const seen = new Set<string>();
    const start = NEW_MOONS[2]!.getTime();
    // Six-hour steps: the quarter bands are about 1.8 days wide, so a daily
    // walk could skip one and pass for the wrong reason.
    for (let step = 0; step < 4 * 30; step += 1) {
      seen.add(moonPhase(new Date(start + step * 6 * 3_600_000)).name);
    }
    expect(seen.size).toBe(8);
  });
});

describe('moonGeometry', () => {
  it('bulges fully at new and full, and is flat at the quarters', () => {
    // The terminator is the projected edge of a half-circle: a full-radius
    // ellipse at new and full, and a straight line at the quarters.
    expect(moonGeometry(moonPhase(NEW_MOONS[0]!)).terminator).toBeCloseTo(1, 1);
    expect(moonGeometry(moonPhase(FULL_MOONS[0]!)).terminator).toBeCloseTo(-1, 1);

    const firstQuarter = new Date(NEW_MOONS[0]!.getTime() + 7.4 * 86_400_000);
    expect(Math.abs(moonGeometry(moonPhase(firstQuarter)).terminator)).toBeLessThan(0.2);
  });

  it('lights the right limb while waxing and the left while waning', () => {
    const newMoon = NEW_MOONS[0]!.getTime();
    expect(moonGeometry(moonPhase(new Date(newMoon + 4 * 86_400_000))).litOnRight).toBe(true);
    expect(moonGeometry(moonPhase(new Date(newMoon + 22 * 86_400_000))).litOnRight).toBe(false);
  });

  it('never leaves the -1..1 range', () => {
    for (let day = 0; day < 60; day += 1) {
      const geometry = moonGeometry(moonPhase(new Date(Date.UTC(2026, 2, 1 + day))));
      expect(geometry.terminator).toBeGreaterThanOrEqual(-1);
      expect(geometry.terminator).toBeLessThanOrEqual(1);
    }
  });
});
