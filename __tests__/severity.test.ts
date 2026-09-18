import { computeChaseIndex, toLevel } from '@/features/weather/model/severity';
import { describeWeatherCode } from '@/features/weather/model/weatherCodes';

const calm = {
  condition: describeWeatherCode(0),
  windGustKmh: 8,
  precipitationMm: 0,
  convective: { capeJkg: 40, liftedIndex: 6 },
};

const supercell = {
  condition: describeWeatherCode(96),
  windGustKmh: 94,
  precipitationMm: 12,
  convective: { capeJkg: 2840, liftedIndex: -7.2 },
};

describe('computeChaseIndex', () => {
  it('scores a calm clear sky as dormant', () => {
    const result = computeChaseIndex(calm);
    expect(result.score).toBe(0);
    expect(result.level).toBe('dormant');
    expect(result.drivers).toHaveLength(0);
  });

  it('scores a hail producing supercell at the top of the scale', () => {
    const result = computeChaseIndex(supercell);
    expect(result.score).toBe(100);
    expect(result.level).toBe('extreme');
    expect(result.drivers[0]).toMatch(/hail/i);
  });

  it('clamps to the 0 to 100 range', () => {
    const result = computeChaseIndex({
      ...supercell,
      windGustKmh: 400,
      precipitationMm: 900,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('ignores convective indices the model did not return', () => {
    const withIndices = computeChaseIndex({
      condition: describeWeatherCode(3),
      windGustKmh: 20,
      precipitationMm: 0,
      convective: { capeJkg: 1600, liftedIndex: -4 },
    });
    const without = computeChaseIndex({
      condition: describeWeatherCode(3),
      windGustKmh: 20,
      precipitationMm: 0,
      convective: { capeJkg: null, liftedIndex: null },
    });

    expect(withIndices.score).toBeGreaterThan(without.score);
    expect(without.score).toBe(3);
  });

  it('orders drivers by contribution', () => {
    const result = computeChaseIndex(supercell);
    expect(result.drivers.length).toBeGreaterThan(1);
    expect(result.drivers[0]).toMatch(/hail/i);
  });

  it('maps scores onto levels at the documented thresholds', () => {
    expect(toLevel(0)).toBe('dormant');
    expect(toLevel(14)).toBe('dormant');
    expect(toLevel(15)).toBe('unsettled');
    expect(toLevel(35)).toBe('active');
    expect(toLevel(60)).toBe('severe');
    expect(toLevel(80)).toBe('extreme');
  });
});
