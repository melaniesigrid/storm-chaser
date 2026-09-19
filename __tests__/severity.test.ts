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

/**
 * The intermediate bands. Each is exercised from a baseline that scores zero
 * (clear sky, no rain, no gusts, no convective indices) so the score IS the
 * band's contribution and the driver line proves which branch produced it.
 * The top and bottom of the ladder were already covered; these are the middles
 * a real afternoon actually lands in.
 */
describe('computeChaseIndex scoring bands', () => {
  const baseline = {
    condition: describeWeatherCode(0),
    windGustKmh: 0,
    precipitationMm: 0,
    convective: { capeJkg: null, liftedIndex: null },
  };

  it('scores nothing at all from the baseline, so each band stands alone', () => {
    const result = computeChaseIndex(baseline);

    expect(result.score).toBe(0);
    expect(result.drivers).toEqual([]);
  });

  it('gives a breezy gust 8 points and says how strong it was', () => {
    const breezy = computeChaseIndex({ ...baseline, windGustKmh: 45 });

    expect(breezy.score).toBe(8);
    expect(breezy.drivers).toEqual(['Breezy gusts 45 km/h']);

    // 30 opens the band, 60 leaves it for the strong tier.
    expect(computeChaseIndex({ ...baseline, windGustKmh: 29.9 }).score).toBe(0);
    expect(computeChaseIndex({ ...baseline, windGustKmh: 30 }).score).toBe(8);
    expect(computeChaseIndex({ ...baseline, windGustKmh: 60 }).score).toBe(18);
  });

  it('gives light rainfall 4 points and names it as light', () => {
    const light = computeChaseIndex({ ...baseline, precipitationMm: 1 });

    expect(light.score).toBe(4);
    expect(light.drivers).toEqual(['Light rainfall']);

    // A trace reading is not rain; 2.5 mm/h is already heavy.
    expect(computeChaseIndex({ ...baseline, precipitationMm: 0.1 }).score).toBe(0);
    expect(computeChaseIndex({ ...baseline, precipitationMm: 0.11 }).score).toBe(4);
    expect(computeChaseIndex({ ...baseline, precipitationMm: 2.5 }).score).toBe(9);
  });

  it('gives marginal instability 5 points and quotes the CAPE it saw', () => {
    const marginal = computeChaseIndex({
      ...baseline,
      convective: { capeJkg: 420, liftedIndex: null },
    });

    expect(marginal.score).toBe(5);
    expect(marginal.drivers).toEqual(['Marginal instability, CAPE 420']);

    // Below 300 there is nothing worth driving to; 800 is moderate.
    expect(
      computeChaseIndex({ ...baseline, convective: { capeJkg: 299, liftedIndex: null } }).score,
    ).toBe(0);
    expect(
      computeChaseIndex({ ...baseline, convective: { capeJkg: 800, liftedIndex: null } }).score,
    ).toBe(11);
  });

  it('gives a slightly unstable lifted index 5 points, to one decimal', () => {
    const slight = computeChaseIndex({
      ...baseline,
      convective: { capeJkg: null, liftedIndex: -1.5 },
    });

    expect(slight.score).toBe(5);
    expect(slight.drivers).toEqual(['Slightly unstable, LI -1.5']);

    // Zero and above is a stable atmosphere; -3 is the unstable band.
    expect(
      computeChaseIndex({ ...baseline, convective: { capeJkg: null, liftedIndex: 0 } }).score,
    ).toBe(0);
    expect(
      computeChaseIndex({ ...baseline, convective: { capeJkg: null, liftedIndex: -3 } }).score,
    ).toBe(10);
  });

  /**
   * Open-Meteo can return a variable as absent, and a bad parse can put NaN
   * where a reading should be. Neither may score, and neither may produce a
   * driver line reading "gusts NaN km/h".
   */
  it('scores nothing from a non-finite reading rather than printing NaN', () => {
    const broken = computeChaseIndex({
      ...baseline,
      windGustKmh: Number.NaN,
      precipitationMm: Number.NaN,
      convective: { capeJkg: Number.NaN, liftedIndex: Number.NaN },
    });

    expect(broken.score).toBe(0);
    expect(broken.drivers).toEqual([]);
  });
});
