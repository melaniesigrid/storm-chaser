/**
 * Presentation helpers. Pure and unit tested: every number a storm chaser reads
 * off this app goes through here, so rounding and unit suffixes stay consistent.
 */

export function formatTemperature(celsius: number | null | undefined): string {
  if (celsius === null || celsius === undefined || Number.isNaN(celsius)) {
    return '--';
  }
  // Math.round(-0.4) is -0, which would render as "-0" in some locales.
  const rounded = Math.round(celsius);
  return `${rounded === 0 ? 0 : rounded}°`;
}

export function formatSpeed(kmh: number | null | undefined): string {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) return '--';
  return `${Math.round(kmh)} km/h`;
}

export function formatPrecipitation(mm: number | null | undefined): string {
  if (mm === null || mm === undefined || Number.isNaN(mm)) return '--';
  return `${mm.toFixed(1)} mm`;
}

export function formatPressure(hPa: number | null | undefined): string {
  if (hPa === null || hPa === undefined || Number.isNaN(hPa)) return '--';
  return `${Math.round(hPa)} hPa`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return `${Math.round(value)}%`;
}

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function formatBearing(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) {
    return '--';
  }
  const normalised = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalised / 22.5) % 16;
  return `${COMPASS[index]} ${Math.round(normalised)}°`;
}

export function formatCoordinates(
  latitude: number,
  longitude: number,
  precision = 4,
): string {
  const lat = `${Math.abs(latitude).toFixed(precision)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lon = `${Math.abs(longitude).toFixed(precision)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lon}`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';

  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function formatHourLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString(undefined, { hour: 'numeric' });
}
