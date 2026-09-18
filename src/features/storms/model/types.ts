import type { Coordinates } from '@/features/weather/model/types';

export type StormTypeId =
  | 'supercell'
  | 'tornado'
  | 'funnel_cloud'
  | 'wall_cloud'
  | 'shelf_cloud'
  | 'squall_line'
  | 'hail'
  | 'lightning'
  | 'flooding'
  | 'dust_storm'
  | 'snow_squall'
  | 'other';

/**
 * Weather is denormalised onto the report on purpose. A field log entry has to
 * stay readable years later without re-querying a forecast API that no longer
 * holds historical data for that timestamp.
 */
export interface CapturedConditions {
  temperatureC: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  pressureHpa: number;
  humidityPct: number;
  precipitationMm: number;
  conditionLabel: string;
  conditionCode: number;
  capeJkg: number | null;
  chaseScore: number;
}

export type SyncState = 'local' | 'pending' | 'synced' | 'failed';

export interface StormReport {
  id: string;
  /** Absolute file URI inside the app document directory. */
  photoUri: string;
  capturedAt: string;
  coordinates: Coordinates | null;
  locationAccuracyM: number | null;
  stormType: StormTypeId;
  notes: string;
  conditions: CapturedConditions | null;
  syncState: SyncState;
  createdAt: string;
  updatedAt: string;
}

/** Everything the capture flow collects before an id and timestamps are added. */
export type StormReportDraft = Omit<
  StormReport,
  'id' | 'createdAt' | 'updatedAt' | 'syncState'
>;
