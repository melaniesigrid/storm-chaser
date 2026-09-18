/**
 * Wire contracts for the Open-Meteo forecast endpoint.
 * Every numeric array is typed as possibly sparse because Open-Meteo returns
 * null for variables a given model does not produce (CAPE and lifted index in
 * particular are missing for some regions).
 */
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number | null;
    apparent_temperature: number | null;
    relative_humidity_2m: number | null;
    precipitation: number | null;
    weather_code: number | null;
    cloud_cover: number | null;
    pressure_msl: number | null;
    wind_speed_10m: number | null;
    wind_direction_10m: number | null;
    wind_gusts_10m: number | null;
    is_day: number | null;
  };
  hourly?: {
    time: string[];
    temperature_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
    precipitation?: (number | null)[];
    weather_code?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    cape?: (number | null)[];
    lifted_index?: (number | null)[];
  };
  daily?: {
    time: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_gusts_10m_max?: (number | null)[];
  };
  error?: boolean;
  reason?: string;
}

export const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'is_day',
].join(',');

export const HOURLY_FIELDS = [
  'temperature_2m',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_gusts_10m',
  'cape',
  'lifted_index',
].join(',');

export const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_gusts_10m_max',
].join(',');
