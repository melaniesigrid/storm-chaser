export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type WeatherConditionGroup =
  | 'clear'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'shower'
  | 'thunderstorm'
  | 'hail'
  | 'unknown';

export interface WeatherCondition {
  code: number;
  group: WeatherConditionGroup;
  label: string;
  /** Short glyph used in place of an icon set. */
  glyph: string;
}

export interface ConvectiveIndices {
  /** Convective available potential energy, J/kg. Null when the model omits it. */
  capeJkg: number | null;
  /** Lifted index, degrees C. Negative values indicate instability. */
  liftedIndex: number | null;
}

export type ChaseLevel = 'dormant' | 'unsettled' | 'active' | 'severe' | 'extreme';

export interface ChaseIndex {
  /** 0 to 100. Higher means better storm chasing conditions. */
  score: number;
  level: ChaseLevel;
  headline: string;
  /** Ordered list of the factors that drove the score, strongest first. */
  drivers: string[];
}

export interface CurrentConditions {
  observedAt: string;
  coordinates: Coordinates;
  timezone: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  cloudCoverPct: number;
  pressureHpa: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  isDay: boolean;
  condition: WeatherCondition;
  convective: ConvectiveIndices;
  chase: ChaseIndex;
}

export interface HourlyPoint {
  time: string;
  temperatureC: number;
  precipitationProbabilityPct: number;
  precipitationMm: number;
  windGustKmh: number;
  capeJkg: number | null;
  condition: WeatherCondition;
}

export interface DailyPoint {
  date: string;
  minTempC: number;
  maxTempC: number;
  precipitationSumMm: number;
  precipitationProbabilityPct: number;
  maxWindGustKmh: number;
  condition: WeatherCondition;
}

export interface WeatherSnapshot {
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  fetchedAt: string;
  /** True when the payload came from the bundled fallback rather than the API. */
  isMock: boolean;
}
