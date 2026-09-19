import type { PollenBand, PollenSpeciesId } from './types';

/**
 * Turning a grain count into a band.
 *
 * The thresholds are per species and they are not close to each other: five
 * grains of ragweed is a moderate day and five grains of birch is nothing at
 * all. A single shared scale -- which is the obvious way to write this --
 * would report a ragweed peak as "low" and a birch morning as "very high",
 * which is precisely backwards for the people who care.
 *
 * Values are grains per cubic metre and follow the bands the European
 * aerobiology networks publish for each taxon. They are the conventional
 * ranges rather than a clinical instrument: pollen sensitivity is individual,
 * and the panel says so rather than implying a diagnosis.
 */

interface SpeciesScale {
  label: string;
  /** Upper bound of low, moderate, and high. Above the last is very high. */
  thresholds: readonly [number, number, number];
}

const SCALES: Record<PollenSpeciesId, SpeciesScale> = {
  // Tree pollens: heavy producers, so the bands run high.
  alder: { label: 'Alder', thresholds: [10, 50, 500] },
  birch: { label: 'Birch', thresholds: [10, 50, 500] },
  olive: { label: 'Olive', thresholds: [10, 50, 200] },
  // Grass: the most common trigger, and a tighter scale than the trees.
  grass: { label: 'Grass', thresholds: [20, 50, 200] },
  // Weeds: potent at low counts, so the bands are the tightest here.
  mugwort: { label: 'Mugwort', thresholds: [5, 25, 50] },
  ragweed: { label: 'Ragweed', thresholds: [5, 20, 50] },
};

export function pollenLabel(species: PollenSpeciesId): string {
  return SCALES[species].label;
}

/**
 * Bands a count for one species.
 *
 * Null in, `'none'` out -- but the caller is expected to keep the null, so it
 * can say "not measured here" rather than "no pollen", which are different
 * claims and only one of them is true outside Europe.
 */
export function pollenBand(
  species: PollenSpeciesId,
  grainsPerM3: number | null,
): PollenBand {
  if (grainsPerM3 === null || !Number.isFinite(grainsPerM3) || grainsPerM3 <= 0) {
    return 'none';
  }

  const [low, moderate, high] = SCALES[species].thresholds;
  if (grainsPerM3 <= low) return 'low';
  if (grainsPerM3 <= moderate) return 'moderate';
  if (grainsPerM3 <= high) return 'high';
  return 'very-high';
}

const BAND_LABELS: Record<PollenBand, string> = {
  none: 'None',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
};

export function pollenBandLabel(band: PollenBand): string {
  return BAND_LABELS[band];
}

/** Every species, in the order the panel lists them. */
export const POLLEN_SPECIES: readonly PollenSpeciesId[] = [
  'grass',
  'birch',
  'alder',
  'ragweed',
  'mugwort',
  'olive',
] as const;

/**
 * The European AQI, in words.
 *
 * Open-Meteo's `european_aqi` runs 0-100+ on six named bands. The numbers are
 * the official upper bounds; anything above the last is "extremely poor",
 * which is a real band and not a rounding artefact.
 */
export function europeanAqiLabel(aqi: number | null): string | null {
  if (aqi === null || !Number.isFinite(aqi)) return null;
  if (aqi <= 20) return 'Good';
  if (aqi <= 40) return 'Fair';
  if (aqi <= 60) return 'Moderate';
  if (aqi <= 80) return 'Poor';
  if (aqi <= 100) return 'Very poor';
  return 'Extremely poor';
}

/**
 * UV index, in words, on the WHO scale.
 *
 * Included because a chaser stands in open ground for hours, frequently under
 * the clearing sky behind a storm where the UV is at its highest and the
 * temperature has just dropped -- which is exactly when nobody thinks about it.
 */
export function uvLabel(uvIndex: number | null): string | null {
  if (uvIndex === null || !Number.isFinite(uvIndex)) return null;
  if (uvIndex < 3) return 'Low';
  if (uvIndex < 6) return 'Moderate';
  if (uvIndex < 8) return 'High';
  if (uvIndex < 11) return 'Very high';
  return 'Extreme';
}
