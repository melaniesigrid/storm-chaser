import type {
  ChaseIndex,
  ChaseLevel,
  ConvectiveIndices,
  WeatherCondition,
} from './types';
import { isConvective } from './weatherCodes';

export interface ChaseIndexInput {
  condition: WeatherCondition;
  windGustKmh: number;
  precipitationMm: number;
  convective: ConvectiveIndices;
}

interface Contribution {
  points: number;
  driver: string;
}

/**
 * Weighted 0 to 100 score describing how interesting the current atmosphere is
 * to a storm chaser. This is a heuristic, not a forecast product: it blends the
 * observed weather code with gust strength, rainfall rate and the two
 * convective indices Open-Meteo exposes (CAPE and lifted index).
 *
 * Kept pure and dependency free so it is trivially unit testable and can later
 * move server side without change.
 */
export function computeChaseIndex(input: ChaseIndexInput): ChaseIndex {
  const contributions: Contribution[] = [
    scoreCondition(input.condition),
    scoreGusts(input.windGustKmh),
    scorePrecipitation(input.precipitationMm),
    scoreCape(input.convective.capeJkg),
    scoreLiftedIndex(input.convective.liftedIndex),
  ];

  const raw = contributions.reduce((total, item) => total + item.points, 0);
  const score = clamp(Math.round(raw), 0, 100);
  const level = toLevel(score);

  const drivers = contributions
    .filter((item) => item.points > 0)
    .sort((a, b) => b.points - a.points)
    .map((item) => item.driver);

  return { score, level, headline: HEADLINES[level], drivers };
}

const HEADLINES: Record<ChaseLevel, string> = {
  dormant: 'Nothing to chase',
  unsettled: 'Unsettled, keep an eye out',
  active: 'Active weather nearby',
  severe: 'Severe potential, stay alert',
  extreme: 'Extreme setup, chase with care',
};

function scoreCondition(condition: WeatherCondition): Contribution {
  if (condition.group === 'hail') {
    return { points: 35, driver: 'Hail reported in observation' };
  }
  if (condition.group === 'thunderstorm') {
    return { points: 30, driver: 'Thunderstorm in observation' };
  }
  if (isConvective(condition.group)) {
    return { points: 15, driver: 'Convective showers' };
  }
  if (condition.group === 'rain') {
    return { points: 8, driver: 'Steady rain' };
  }
  if (condition.group === 'cloud') {
    return { points: 3, driver: 'Cloud cover building' };
  }
  return { points: 0, driver: '' };
}

function scoreGusts(gustKmh: number): Contribution {
  if (!Number.isFinite(gustKmh) || gustKmh < 30) return { points: 0, driver: '' };
  if (gustKmh >= 90) return { points: 25, driver: `Damaging gusts ${Math.round(gustKmh)} km/h` };
  if (gustKmh >= 60) return { points: 18, driver: `Strong gusts ${Math.round(gustKmh)} km/h` };
  return { points: 8, driver: `Breezy gusts ${Math.round(gustKmh)} km/h` };
}

function scorePrecipitation(mm: number): Contribution {
  if (!Number.isFinite(mm) || mm <= 0.1) return { points: 0, driver: '' };
  if (mm >= 10) return { points: 15, driver: 'Torrential rainfall rate' };
  if (mm >= 2.5) return { points: 9, driver: 'Heavy rainfall rate' };
  return { points: 4, driver: 'Light rainfall' };
}

function scoreCape(capeJkg: number | null): Contribution {
  if (capeJkg === null || !Number.isFinite(capeJkg)) return { points: 0, driver: '' };
  if (capeJkg >= 2500) return { points: 25, driver: `Extreme instability, CAPE ${Math.round(capeJkg)}` };
  if (capeJkg >= 1500) return { points: 18, driver: `Strong instability, CAPE ${Math.round(capeJkg)}` };
  if (capeJkg >= 800) return { points: 11, driver: `Moderate instability, CAPE ${Math.round(capeJkg)}` };
  if (capeJkg >= 300) return { points: 5, driver: `Marginal instability, CAPE ${Math.round(capeJkg)}` };
  return { points: 0, driver: '' };
}

function scoreLiftedIndex(liftedIndex: number | null): Contribution {
  if (liftedIndex === null || !Number.isFinite(liftedIndex)) {
    return { points: 0, driver: '' };
  }
  if (liftedIndex <= -6) return { points: 15, driver: `Very unstable, LI ${liftedIndex.toFixed(1)}` };
  if (liftedIndex <= -3) return { points: 10, driver: `Unstable, LI ${liftedIndex.toFixed(1)}` };
  if (liftedIndex < 0) return { points: 5, driver: `Slightly unstable, LI ${liftedIndex.toFixed(1)}` };
  return { points: 0, driver: '' };
}

export function toLevel(score: number): ChaseLevel {
  if (score >= 80) return 'extreme';
  if (score >= 60) return 'severe';
  if (score >= 35) return 'active';
  if (score >= 15) return 'unsettled';
  return 'dormant';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
