/**
 * Where the moon is in its cycle, right now, for real.
 *
 * Pure arithmetic on a date. No network, no native module, no almanac file --
 * which matters for the same reason `resolveAutoTheme` is pure: the night sky
 * has to be right on a cold start in airplane mode, halfway up a hill, which
 * is where this app gets used.
 *
 * The approach is the standard low-precision one (Meeus, chapter 47, reduced
 * to the leading terms). Mean longitudes for the sun and the moon, one
 * equation-of-centre correction each, then the elongation between them. Good
 * to about a degree of phase angle, which is under half an hour of cycle --
 * far finer than a drawing of a moon can show.
 *
 * What it deliberately does NOT do is the naive version: days since a known
 * new moon, modulo 29.53. That ignores orbital eccentricity and drifts up to
 * about half a day, which is the difference between a thin crescent and no
 * crescent at all on the nights either side of new.
 */

const RAD = Math.PI / 180;
const MS_PER_DAY = 86_400_000;

/** Unix ms at the J2000.0 epoch, 2000-01-01 12:00 TT. */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/** The mean synodic month, in days. Used only to report cycle position. */
export const SYNODIC_MONTH_DAYS = 29.530588853;

/**
 * The eight phase names, in cycle order.
 *
 * Named rather than computed from the illuminated fraction alone, because
 * illumination cannot tell waxing from waning: a half-lit moon is either the
 * first quarter or the last, and they are a fortnight apart.
 */
export type MoonPhaseName =
  | 'new'
  | 'waxing crescent'
  | 'first quarter'
  | 'waxing gibbous'
  | 'full'
  | 'waning gibbous'
  | 'last quarter'
  | 'waning crescent';

export interface MoonPhase {
  /**
   * How much of the disc is lit, 0 at new and 1 at full.
   *
   * This is the fraction of the visible disc's AREA, which is what the eye
   * reads, not the fraction of its width.
   */
  illuminated: number;
  /**
   * Position in the cycle, 0 at new, 0.5 at full, approaching 1 back at new.
   * This is what the drawing uses, because it distinguishes the two halves.
   */
  cycle: number;
  /** True from new through full, false from full back to new. */
  waxing: boolean;
  name: MoonPhaseName;
  /** Days since the last new moon, for the readout. */
  ageDays: number;
}

/** Wraps to [0, 360). */
function norm360(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function daysSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_MS) / MS_PER_DAY;
}

/**
 * The sun's apparent ecliptic longitude, in degrees.
 *
 * Mean longitude plus the equation of centre. The third harmonic is kept even
 * though it never exceeds about a thousandth of a degree, because dropping it
 * saves nothing and its absence is the kind of thing that gets "fixed" back
 * in later by someone comparing against a reference implementation.
 */
function sunLongitude(d: number): number {
  const meanAnomaly = RAD * norm360(357.5291 + 0.98560028 * d);
  const meanLongitude = 280.459 + 0.98564736 * d;
  const centre =
    1.9148 * Math.sin(meanAnomaly) +
    0.02 * Math.sin(2 * meanAnomaly) +
    0.0003 * Math.sin(3 * meanAnomaly);
  return norm360(meanLongitude + centre);
}

/**
 * The moon's apparent ecliptic longitude, in degrees.
 *
 * Three terms: the mean longitude, the equation of centre (6.289°, by far the
 * largest correction), and evection (1.274°), which is the sun's tug on the
 * lunar orbit and the biggest remaining error if it is left out.
 */
function moonLongitude(d: number): number {
  const meanLongitude = 218.316 + 13.176396 * d;
  const meanAnomaly = RAD * norm360(134.963 + 13.064993 * d);
  const meanElongation = RAD * norm360(297.8502 + 12.19074912 * d);

  return norm360(
    meanLongitude +
      6.289 * Math.sin(meanAnomaly) +
      1.274 * Math.sin(2 * meanElongation - meanAnomaly) +
      0.658 * Math.sin(2 * meanElongation) +
      0.214 * Math.sin(2 * meanAnomaly) -
      0.186 * Math.sin(RAD * norm360(357.5291 + 0.98560028 * d)),
  );
}

function nameFor(cycle: number): MoonPhaseName {
  // Boundaries at eighths, with the four "instant" phases given a narrow band
  // around them rather than a single point -- nobody calls a moon 0.4% past
  // full anything but full.
  const eighth = 1 / 8;
  const half = eighth / 2;
  if (cycle < half || cycle >= 1 - half) return 'new';
  if (cycle < eighth * 2 - half) return 'waxing crescent';
  if (cycle < eighth * 2 + half) return 'first quarter';
  if (cycle < eighth * 4 - half) return 'waxing gibbous';
  if (cycle < eighth * 4 + half) return 'full';
  if (cycle < eighth * 6 - half) return 'waning gibbous';
  if (cycle < eighth * 6 + half) return 'last quarter';
  return 'waning crescent';
}

export function moonPhase(date: Date = new Date()): MoonPhase {
  const d = daysSinceJ2000(date);

  // Elongation: how far ahead of the sun the moon has moved. 0 is new, 180 is
  // full. This single angle carries both the illumination and the direction,
  // which is why the drawing takes it rather than the fraction.
  const elongation = norm360(moonLongitude(d) - sunLongitude(d));

  const cycle = elongation / 360;
  const illuminated = (1 - Math.cos(RAD * elongation)) / 2;

  return {
    illuminated,
    cycle,
    waxing: elongation < 180,
    name: nameFor(cycle),
    ageDays: cycle * SYNODIC_MONTH_DAYS,
  };
}

/**
 * How the terminator is drawn, as two horizontal radii.
 *
 * A moon is a circle with one curve across it. The lit edge is always a
 * half-circle; the terminator is the projection of the other half-circle,
 * which is an ellipse whose horizontal radius shrinks to zero at the quarters
 * and grows back to the full radius at new and full. `terminator` is that
 * radius as a signed fraction: positive when the ellipse bulges the same way
 * as the lit limb (gibbous), negative when it cuts the other way (crescent).
 *
 * Split out from `moonPhase` so the geometry is testable without a renderer,
 * the same way the seal's layout is.
 */
export interface MoonGeometry {
  /** True when the lit limb is on the right, as seen from the north. */
  litOnRight: boolean;
  /** -1..1. Sign says which way the terminator bows. */
  terminator: number;
  /** 0..1, for callers that just want to fade a disc. */
  illuminated: number;
}

export function moonGeometry(phase: MoonPhase): MoonGeometry {
  // cos of the elongation runs +1 at new, 0 at the quarters, -1 at full, and
  // that is exactly the signed ellipse radius the terminator needs.
  const terminator = Math.cos(2 * Math.PI * phase.cycle);

  return {
    // Northern hemisphere convention: a waxing moon is lit on the right.
    litOnRight: phase.waxing,
    terminator,
    illuminated: phase.illuminated,
  };
}
