/**
 * Air quality and pollen, as the app understands them.
 *
 * A separate feature from `weather` rather than more fields on the forecast,
 * because it is a separate Open-Meteo endpoint with a separate coverage
 * story: particulates and UV are global, pollen is Europe-only. Folding them
 * together would mean a snapshot that is partly null for most of the planet
 * and no honest way to say why.
 */

export type PollenSpeciesId =
  | 'alder'
  | 'birch'
  | 'grass'
  | 'mugwort'
  | 'olive'
  | 'ragweed';

/**
 * The five bands a pollen count falls into.
 *
 * Shared vocabulary with nothing else in the app on purpose: these are not
 * the chase tiers. A high grass count and a severe storm are unrelated facts
 * and must not borrow each other's colours.
 */
export type PollenBand = 'none' | 'low' | 'moderate' | 'high' | 'very-high';

export interface PollenReading {
  species: PollenSpeciesId;
  label: string;
  /** Grains per cubic metre. Null where the model has no coverage. */
  grainsPerM3: number | null;
  band: PollenBand;
}

/** Which scale the headline AQI number is on. They are not interchangeable. */
export type AqiScale = 'european' | 'us';

export interface AirQualityBandInfo {
  band: PollenBand;
  label: string;
}

export interface AirSnapshot {
  /** Null when the service has no air-quality coverage for these coordinates. */
  aqi: number | null;
  aqiScale: AqiScale;
  /** Plain-language reading of `aqi`, e.g. "Fair". */
  aqiLabel: string | null;
  pm25: number | null;
  pm10: number | null;
  /**
   * UV index. Genuinely operational rather than a nicety: a chaser stands in
   * open ground for hours, often under a clearing sky behind a storm.
   */
  uvIndex: number | null;
  /**
   * One entry per species the model covers here. Empty outside Europe, which
   * is a real answer and is rendered as one.
   */
  pollen: PollenReading[];
  /** True when every pollen species came back null: outside CAMS coverage. */
  pollenUnavailable: boolean;
}
