import type { Coordinates, WeatherConditionGroup } from '@/features/weather/model/types';

import type { ThemeName } from './themes';

/**
 * Which theme the sky itself implies.
 *
 * Pure and synchronous. The important property is that this needs no network:
 * sunrise and sunset are arithmetic on a date and a position, so the app can
 * resolve the right theme on a cold start, in airplane mode, before any
 * forecast has loaded. That is what keeps auto mode free of a loading state and
 * free of the theme flash that a network-dependent answer would cause.
 *
 * Weather is enrichment, never the input. A thunderstorm darkens a daytime sky
 * enough to be worth switching for, but if the forecast never arrives the
 * answer is still correct.
 *
 * Type-only imports from the weather feature, so the theme layer stays pure and
 * unit testable with no native modules. `themes.ts` already takes `ChaseLevel`
 * the same way.
 */

const RAD = Math.PI / 180;
const MS_PER_DAY = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;

/** Earth's axial tilt. */
const OBLIQUITY = RAD * 23.4397;

/**
 * The altitude that counts as sunrise: the sun's upper limb touching the
 * horizon, with atmospheric refraction folded in. Not zero, which is why a
 * naive "is the sun above the horizon" check is minutes out.
 */
const SUNRISE_ALTITUDE = RAD * -0.833;

/**
 * Groups dark enough to read as night in daylight. Rain alone does not qualify
 * -- an overcast afternoon is still an afternoon. A thunderstorm is a different
 * sky, and it is the one this app exists for.
 */
const STORM_GROUPS: readonly WeatherConditionGroup[] = ['thunderstorm', 'hail'];

/**
 * What the sun does at a given place on a given day.
 *
 * Above the Arctic and below the Antarctic circle there are stretches of the
 * year where the sun never rises or never sets, and the hour-angle equation has
 * no solution. Those are real places people chase storms in, so they are named
 * cases rather than a NaN falling through the bottom of the function.
 */
export type SunTimes =
  | { kind: 'normal'; sunriseMs: number; sunsetMs: number }
  | { kind: 'polar-day' }
  | { kind: 'polar-night' };

function toDays(ms: number): number {
  return ms / MS_PER_DAY - 0.5 + J1970 - J2000;
}

function fromJulian(julian: number): number {
  return (julian + 0.5 - J1970) * MS_PER_DAY;
}

function solarMeanAnomaly(days: number): number {
  return RAD * (357.5291 + 0.98560028 * days);
}

function eclipticLongitude(meanAnomaly: number): number {
  const center =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = RAD * 102.9372;

  return meanAnomaly + center + perihelion + Math.PI;
}

/**
 * Sunrise and sunset as absolute UTC instants.
 *
 * Returning instants rather than clock times is deliberate: it means no
 * timezone conversion happens anywhere in this module, so there is no second
 * place for the UTC-versus-local class of bug that `dayLabel` already shipped
 * once. The caller compares instants to instants.
 */
export function sunTimes(date: Date, coordinates: Coordinates): SunTimes {
  const { latitude, longitude } = coordinates;

  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const days = toDays(date.getTime());

  const cycle = Math.round(days - 0.0009 - lw / (2 * Math.PI));
  const approxTransit = 0.0009 + lw / (2 * Math.PI) + cycle;

  const meanAnomaly = solarMeanAnomaly(approxTransit);
  const longitudeEcliptic = eclipticLongitude(meanAnomaly);
  const declination = Math.asin(Math.sin(OBLIQUITY) * Math.sin(longitudeEcliptic));

  const solarNoon =
    J2000 +
    approxTransit +
    0.0053 * Math.sin(meanAnomaly) -
    0.0069 * Math.sin(2 * longitudeEcliptic);

  const cosHourAngle =
    (Math.sin(SUNRISE_ALTITUDE) - Math.sin(phi) * Math.sin(declination)) /
    (Math.cos(phi) * Math.cos(declination));

  // Outside [-1, 1] the sun never crosses the sunrise altitude at all. Above 1
  // it never climbs to it; below -1 it never falls to it.
  if (cosHourAngle > 1) return { kind: 'polar-night' };
  if (cosHourAngle < -1) return { kind: 'polar-day' };

  const hourAngle = Math.acos(cosHourAngle);
  const setTransit = 0.0009 + (hourAngle + lw) / (2 * Math.PI) + cycle;
  const jset =
    J2000 +
    setTransit +
    0.0053 * Math.sin(meanAnomaly) -
    0.0069 * Math.sin(2 * longitudeEcliptic);
  const jrise = solarNoon - (jset - solarNoon);

  return { kind: 'normal', sunriseMs: fromJulian(jrise), sunsetMs: fromJulian(jset) };
}

/**
 * The theme the current sky implies, or `null` when there is nothing to go on.
 *
 * `null` rather than a guessed default, so the fallback policy lives with the
 * caller that knows about system appearance instead of being buried here. A
 * device that has never had a location fix gets the OS light/dark setting,
 * which is a better answer than pretending to know where the sun is.
 *
 * Only the two Bricolage variants are ever returned. Broadcast and Field Card
 * are taste choices rather than weather conditions, and they are also the two
 * themes whose backgrounds are not generated from the sky at all -- there is
 * nothing for the sun to resolve. Auto mode has no business picking either.
 */
export function resolveAutoTheme(
  date: Date,
  coordinates: Coordinates | null,
  condition?: WeatherConditionGroup,
): ThemeName | null {
  if (coordinates === null) return null;

  const { latitude, longitude } = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  if (Number.isNaN(date.getTime())) return null;

  const sun = sunTimes(date, coordinates);

  const isDaylight =
    sun.kind === 'polar-day'
      ? true
      : sun.kind === 'polar-night'
        ? false
        : date.getTime() >= sun.sunriseMs && date.getTime() <= sun.sunsetMs;

  if (!isDaylight) return 'skyward-night';

  // Daylight, but the sky is a storm. That is the whole premise of the app, so
  // it gets the night treatment.
  if (condition !== undefined && STORM_GROUPS.includes(condition)) {
    return 'skyward-night';
  }

  return 'skyward-day';
}
