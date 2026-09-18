import {
  formatBearing,
  formatCoordinates,
  formatPrecipitation,
  formatRelativeTime,
  formatSpeed,
  formatTemperature,
} from '@/core/utils/format';

describe('format helpers', () => {
  it('rounds temperatures and degrades gracefully on missing values', () => {
    expect(formatTemperature(21.4)).toBe('21°');
    // Negative zero must not leak into the readout.
    expect(formatTemperature(-0.4)).toBe('0°');
    expect(formatTemperature(-3.6)).toBe('-4°');
    expect(formatTemperature(null)).toBe('--');
    expect(formatTemperature(undefined)).toBe('--');
    expect(formatTemperature(Number.NaN)).toBe('--');
  });

  it('formats wind and precipitation with units', () => {
    expect(formatSpeed(78.4)).toBe('78 km/h');
    expect(formatPrecipitation(3.25)).toBe('3.3 mm');
  });

  it('converts a bearing to the nearest compass point', () => {
    expect(formatBearing(0)).toBe('N 0°');
    expect(formatBearing(90)).toBe('E 90°');
    expect(formatBearing(200)).toBe('SSW 200°');
    // Wraps past a full turn rather than producing an out of range index.
    expect(formatBearing(370)).toBe('N 10°');
    expect(formatBearing(-90)).toBe('W 270°');
  });

  it('labels hemispheres on coordinates', () => {
    expect(formatCoordinates(43.6532, -79.3832, 2)).toBe('43.65° N, 79.38° W');
  });

  it('describes elapsed time in field friendly units', () => {
    const now = new Date('2026-05-01T12:00:00.000Z');
    expect(formatRelativeTime('2026-05-01T11:59:40.000Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-05-01T11:45:00.000Z', now)).toBe('15 min ago');
    expect(formatRelativeTime('2026-05-01T09:00:00.000Z', now)).toBe('3 h ago');
    expect(formatRelativeTime('2026-04-28T12:00:00.000Z', now)).toBe('3 d ago');
    expect(formatRelativeTime('not-a-date', now)).toBe('unknown');
  });
});
