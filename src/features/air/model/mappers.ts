import {
  europeanAqiLabel,
  POLLEN_SPECIES,
  pollenBand,
  pollenLabel,
} from './pollen';
import type { AirSnapshot, PollenReading } from './types';

/**
 * The shape Open-Meteo's air-quality endpoint returns.
 *
 * Declared here rather than imported from a generated client, matching how
 * `weather/api/contracts.ts` handles the forecast endpoint: the app owns its
 * understanding of the wire format and converts at the boundary.
 */
export interface OpenMeteoAirResponse {
  error?: boolean;
  reason?: string;
  current?: {
    european_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
    uv_index?: number | null;
    alder_pollen?: number | null;
    birch_pollen?: number | null;
    grass_pollen?: number | null;
    mugwort_pollen?: number | null;
    olive_pollen?: number | null;
    ragweed_pollen?: number | null;
  };
}

/**
 * Open-Meteo returns `null` for a field it has no model for, and the JSON can
 * also carry a number that is not finite. Both mean the same thing here, and
 * neither may reach the UI as a number: a pollen count of NaN renders as
 * "NaN grains" and a count coerced to 0 renders as a confident "None", which
 * is the worse of the two because it looks like an answer.
 */
function reading(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const WIRE_KEYS = {
  alder: 'alder_pollen',
  birch: 'birch_pollen',
  grass: 'grass_pollen',
  mugwort: 'mugwort_pollen',
  olive: 'olive_pollen',
  ragweed: 'ragweed_pollen',
} as const;

export function toAirSnapshot(payload: OpenMeteoAirResponse): AirSnapshot {
  const current = payload.current ?? {};

  const pollen: PollenReading[] = POLLEN_SPECIES.map((species) => {
    const grainsPerM3 = reading(current[WIRE_KEYS[species]]);
    return {
      species,
      label: pollenLabel(species),
      grainsPerM3,
      band: pollenBand(species, grainsPerM3),
    };
  });

  const aqi = reading(current.european_aqi);

  return {
    aqi,
    aqiScale: 'european',
    aqiLabel: europeanAqiLabel(aqi),
    pm25: reading(current.pm2_5),
    pm10: reading(current.pm10),
    uvIndex: reading(current.uv_index),
    pollen,
    /*
     * Coverage, not a zero reading.
     *
     * CAMS models pollen over Europe only, so everywhere else every species
     * comes back null at once. That is "we do not measure this here", which
     * is a different sentence from "there is no pollen here", and the panel
     * has to be able to tell them apart. A genuine calm day in Europe gives
     * zeroes, not nulls, and still renders the list.
     */
    pollenUnavailable: pollen.every((entry) => entry.grainsPerM3 === null),
  };
}
