import type { StormReport } from './types';

/**
 * The region a map should open on, as a plain object.
 *
 * Structurally identical to `react-native-maps`' `Region`, and deliberately
 * declared here rather than imported from it: that package reaches for a
 * native module the moment it is required, which puts anything importing it
 * out of reach of the unit suite. This is pure arithmetic over coordinates and
 * has no business being untestable.
 */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** Fits every plotted report on screen with a small margin. */
export function boundingRegion(reports: StormReport[]): MapRegion | undefined {
  const points = reports
    .map((report) => report.coordinates)
    .filter((value): value is { latitude: number; longitude: number } => value !== null);

  if (!points.length) return undefined;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.05, (maxLon - minLon) * 1.6),
  };
}
