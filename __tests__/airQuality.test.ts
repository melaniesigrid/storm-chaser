import { buildAirQualityUrl } from '@/features/air/api/airQualityClient';
import { toAirSnapshot, type OpenMeteoAirResponse } from '@/features/air/model/mappers';
import {
  europeanAqiLabel,
  POLLEN_SPECIES,
  pollenBand,
  pollenBandLabel,
  uvLabel,
} from '@/features/air/model/pollen';

const vancouver = { latitude: 49.2827, longitude: -123.1207 };

function payload(current: OpenMeteoAirResponse['current']): OpenMeteoAirResponse {
  return { current };
}

describe('pollenBand', () => {
  it('bands each species on its own scale, not a shared one', () => {
    // The whole reason this function takes a species. Five grains is a
    // moderate ragweed day and nothing at all for birch; a single shared
    // ladder reports both backwards.
    expect(pollenBand('ragweed', 5)).toBe('low');
    expect(pollenBand('ragweed', 21)).toBe('high');
    expect(pollenBand('birch', 5)).toBe('low');
    expect(pollenBand('birch', 21)).toBe('moderate');
    expect(pollenBand('birch', 200)).toBe('high');
    expect(pollenBand('birch', 600)).toBe('very-high');
  });

  it('treats a zero count as none rather than low', () => {
    for (const species of POLLEN_SPECIES) {
      expect(pollenBand(species, 0)).toBe('none');
    }
  });

  it('treats a missing or non-finite count as none', () => {
    expect(pollenBand('grass', null)).toBe('none');
    expect(pollenBand('grass', Number.NaN)).toBe('none');
    // Infinity is corrupt data, not a record-breaking pollen day. Banding it
    // as "very high" would put a fabricated alarm in front of someone who
    // might act on it.
    expect(pollenBand('grass', Number.POSITIVE_INFINITY)).toBe('none');
    expect(pollenBand('grass', -4)).toBe('none');
  });

  it('is monotonic for every species', () => {
    // A threshold typed out of order would still pass the spot checks above.
    const order = ['none', 'low', 'moderate', 'high', 'very-high'];
    for (const species of POLLEN_SPECIES) {
      let lowest = 0;
      for (const count of [0, 1, 6, 11, 21, 26, 51, 201, 501, 5000]) {
        const rank = order.indexOf(pollenBand(species, count));
        expect(rank).toBeGreaterThanOrEqual(lowest);
        lowest = rank;
      }
    }
  });

  it('names every band', () => {
    for (const band of ['none', 'low', 'moderate', 'high', 'very-high'] as const) {
      expect(pollenBandLabel(band)).toMatch(/\w/);
    }
  });
});

describe('europeanAqiLabel', () => {
  it('reads the official bands', () => {
    expect(europeanAqiLabel(0)).toBe('Good');
    expect(europeanAqiLabel(20)).toBe('Good');
    expect(europeanAqiLabel(21)).toBe('Fair');
    expect(europeanAqiLabel(60)).toBe('Moderate');
    expect(europeanAqiLabel(80)).toBe('Poor');
    expect(europeanAqiLabel(100)).toBe('Very poor');
    expect(europeanAqiLabel(140)).toBe('Extremely poor');
  });

  it('has no label for a missing reading', () => {
    expect(europeanAqiLabel(null)).toBeNull();
    expect(europeanAqiLabel(Number.NaN)).toBeNull();
  });
});

describe('uvLabel', () => {
  it('reads the WHO bands', () => {
    expect(uvLabel(0)).toBe('Low');
    expect(uvLabel(2.9)).toBe('Low');
    expect(uvLabel(3)).toBe('Moderate');
    expect(uvLabel(6)).toBe('High');
    expect(uvLabel(8)).toBe('Very high');
    expect(uvLabel(11)).toBe('Extreme');
  });

  it('has no label for a missing reading', () => {
    expect(uvLabel(null)).toBeNull();
  });
});

describe('toAirSnapshot', () => {
  it('maps a full European reading', () => {
    const snapshot = toAirSnapshot(
      payload({
        european_aqi: 32,
        pm2_5: 7.4,
        pm10: 14.1,
        uv_index: 6.2,
        grass_pollen: 64,
        birch_pollen: 3,
        alder_pollen: 0,
        ragweed_pollen: 0,
        mugwort_pollen: 0,
        olive_pollen: 0,
      }),
    );

    expect(snapshot.aqi).toBe(32);
    expect(snapshot.aqiLabel).toBe('Fair');
    expect(snapshot.uvIndex).toBeCloseTo(6.2);
    expect(snapshot.pollenUnavailable).toBe(false);

    const grass = snapshot.pollen.find((entry) => entry.species === 'grass');
    expect(grass?.band).toBe('high');
    expect(grass?.label).toBe('Grass');
  });

  it('distinguishes no coverage from a calm day', () => {
    // The distinction the panel is built around. All-null is "we do not
    // model pollen here"; all-zero is "we do, and there is none today".
    const outsideEurope = toAirSnapshot(
      payload({ european_aqi: 18, pm2_5: 4, pm10: 9, uv_index: 8 }),
    );
    expect(outsideEurope.pollenUnavailable).toBe(true);

    const calmEuropeanDay = toAirSnapshot(
      payload({
        grass_pollen: 0,
        birch_pollen: 0,
        alder_pollen: 0,
        ragweed_pollen: 0,
        mugwort_pollen: 0,
        olive_pollen: 0,
      }),
    );
    expect(calmEuropeanDay.pollenUnavailable).toBe(false);
    expect(calmEuropeanDay.pollen.every((entry) => entry.band === 'none')).toBe(true);
  });

  it('never turns a missing reading into a number', () => {
    // A null coerced to 0 renders as a confident "None", which is worse than
    // a blank because it looks like an answer.
    const snapshot = toAirSnapshot(payload({}));
    expect(snapshot.aqi).toBeNull();
    expect(snapshot.aqiLabel).toBeNull();
    expect(snapshot.pm25).toBeNull();
    expect(snapshot.pm10).toBeNull();
    expect(snapshot.uvIndex).toBeNull();
    for (const entry of snapshot.pollen) {
      expect(entry.grainsPerM3).toBeNull();
    }
  });

  it('rejects non-finite numbers from the wire', () => {
    const snapshot = toAirSnapshot(
      payload({ european_aqi: Number.NaN, uv_index: Number.NaN, grass_pollen: Number.NaN }),
    );
    expect(snapshot.aqi).toBeNull();
    expect(snapshot.uvIndex).toBeNull();
    expect(snapshot.pollen.find((entry) => entry.species === 'grass')?.grainsPerM3).toBeNull();
  });

  it('survives a response with no current block at all', () => {
    expect(() => toAirSnapshot({})).not.toThrow();
    expect(toAirSnapshot({}).pollen).toHaveLength(POLLEN_SPECIES.length);
  });

  it('lists every species in a stable order', () => {
    expect(toAirSnapshot(payload({})).pollen.map((entry) => entry.species)).toEqual([
      ...POLLEN_SPECIES,
    ]);
  });
});

describe('buildAirQualityUrl', () => {
  it('asks for every field the snapshot maps', () => {
    const url = buildAirQualityUrl(vancouver);
    for (const field of [
      'european_aqi', 'pm2_5', 'pm10', 'uv_index',
      'alder_pollen', 'birch_pollen', 'grass_pollen',
      'mugwort_pollen', 'olive_pollen', 'ragweed_pollen',
    ]) {
      expect(url).toContain(field);
    }
  });

  it('rounds coordinates to four places and asks for local time', () => {
    const url = buildAirQualityUrl(vancouver);
    expect(url).toContain('latitude=49.2827');
    expect(url).toContain('longitude=-123.1207');
    expect(url).toContain('timezone=auto');
  });

  it('needs no API key, which is the claim the README makes', () => {
    expect(buildAirQualityUrl(vancouver)).not.toMatch(/key|token|apikey/i);
  });
});
