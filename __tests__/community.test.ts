import { isDemoSet } from '@/features/storms/model/community';
import { cloudSyncClient } from '@/services/cloud/CloudSyncClient';
import { sampleCommunityReports } from '@/services/cloud/communitySample';
import { describeStormType } from '@/features/storms/model/stormTypes';
import { toLevel } from '@/features/weather/model/severity';

const TORONTO = { latitude: 43.6532, longitude: -79.3832 };

describe('sampleCommunityReports', () => {
  it('plots around the viewer rather than at fixed coordinates', () => {
    const here = sampleCommunityReports(TORONTO);
    const elsewhere = sampleCommunityReports({ latitude: -33.86, longitude: 151.2 });

    expect(here).toHaveLength(elsewhere.length);
    // The nearby half is ordered first, so index 0 is a viewer-relative pin.
    expect(here[0]?.coordinates).not.toEqual(elsewhere[0]?.coordinates);
  });

  it('puts some reports within reach of the viewer, wherever they are', () => {
    // The nearby half is what makes the map useful on first run. It is asserted
    // as "at least some are close" rather than "all are", because the set now
    // also carries fixed worldwide pins that are close to nobody in particular.
    for (const origin of [TORONTO, { latitude: -33.86, longitude: 151.2 }]) {
      const nearby = sampleCommunityReports(origin).filter(
        (report) => Math.abs(report.coordinates.latitude - origin.latitude) < 1.5,
      );

      expect(nearby.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('carries a worldwide set that does not move with the viewer', () => {
    const here = sampleCommunityReports(TORONTO);
    const elsewhere = sampleCommunityReports({ latitude: -33.86, longitude: 151.2 });

    const fixed = here.filter((report) =>
      elsewhere.some(
        (other) =>
          other.id === report.id &&
          other.coordinates.latitude === report.coordinates.latitude &&
          other.coordinates.longitude === report.coordinates.longitude,
      ),
    );

    // Every continent should be represented no matter where the viewer stands.
    expect(fixed.length).toBeGreaterThanOrEqual(30);
  });

  it('spreads the worldwide set across both hemispheres', () => {
    const reports = sampleCommunityReports(TORONTO);

    expect(reports.some((r) => r.coordinates.latitude > 40)).toBe(true);
    expect(reports.some((r) => r.coordinates.latitude < -25)).toBe(true);
    expect(reports.some((r) => r.coordinates.longitude > 100)).toBe(true);
    expect(reports.some((r) => r.coordinates.longitude < -90)).toBe(true);
  });

  it('gives every sample report a unique id', () => {
    const ids = sampleCommunityReports(TORONTO).map((report) => report.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every generated point on the globe', () => {
    // Near the pole and hard against the antimeridian: both would otherwise
    // produce coordinates a map cannot render.
    for (const origin of [
      { latitude: 89.5, longitude: 179.8 },
      { latitude: -89.5, longitude: -179.8 },
    ]) {
      for (const report of sampleCommunityReports(origin)) {
        expect(report.coordinates.latitude).toBeGreaterThanOrEqual(-90);
        expect(report.coordinates.latitude).toBeLessThanOrEqual(90);
        expect(report.coordinates.longitude).toBeGreaterThanOrEqual(-180);
        expect(report.coordinates.longitude).toBeLessThanOrEqual(180);
      }
    }
  });

  /**
   * The pole guard is a hard 85 degrees, not 90: a marker placed at the pole
   * itself has no meaningful longitude and the map projection stretches it
   * across the whole top of the screen. This moved to the shared `clamp` in
   * this change, so the bound is asserted rather than assumed.
   */
  it('stops generated pins 5 degrees short of each pole', () => {
    const northern = sampleCommunityReports({ latitude: 89.9, longitude: 0 });
    const southern = sampleCommunityReports({ latitude: -89.9, longitude: 0 });

    expect(Math.max(...northern.map((r) => r.coordinates.latitude))).toBe(85);
    expect(Math.min(...southern.map((r) => r.coordinates.latitude))).toBe(-85);
  });

  it('wraps a longitude past the antimeridian instead of running off the map', () => {
    const reports = sampleCommunityReports({ latitude: 0, longitude: 179.6 });
    const longitudes = reports.map((report) => report.coordinates.longitude);

    // The seed offset by +0.74 lands on 180.34, which belongs just inside the
    // western half of the map rather than off the eastern edge of it.
    expect(longitudes).toContainEqual(expect.closeTo(-179.66, 5));
    for (const longitude of longitudes) {
      expect(Math.abs(longitude)).toBeLessThanOrEqual(180);
    }
  });

  it('tags every bundled report as sample, never as remote', () => {
    for (const report of sampleCommunityReports(TORONTO)) {
      expect(report.source).toBe('sample');
    }
  });

  it('uses storm types the app can actually describe', () => {
    for (const report of sampleCommunityReports(TORONTO)) {
      expect(describeStormType(report.stormType).id).toBe(report.stormType);
    }
  });

  it('carries scores that resolve to a real chase tier', () => {
    for (const report of sampleCommunityReports(TORONTO)) {
      expect(report.chaseScore).toBeGreaterThanOrEqual(0);
      expect(report.chaseScore).toBeLessThanOrEqual(100);
      expect(toLevel(report.chaseScore)).toBeDefined();
    }
  });

  it('dates reports in the past, relative to the clock it is given', () => {
    const now = new Date('2026-05-01T12:00:00.000Z');

    for (const report of sampleCommunityReports(TORONTO, now)) {
      expect(new Date(report.capturedAt).getTime()).toBeLessThan(now.getTime());
    }
  });
});

describe('isDemoSet', () => {
  it('is false for an empty set, so nothing is badged as demo data', () => {
    expect(isDemoSet([])).toBe(false);
  });

  it('is true when every report is bundled', () => {
    expect(isDemoSet(sampleCommunityReports(TORONTO))).toBe(true);
  });

  it('is false as soon as one report came from a backend', () => {
    const mixed = sampleCommunityReports(TORONTO);
    mixed[0] = { ...(mixed[0] as (typeof mixed)[number]), source: 'remote' };

    expect(isDemoSet(mixed)).toBe(false);
  });
});

describe('cloudSyncClient.fetchCommunityReports', () => {
  it('is not configured without EXPO_PUBLIC_SYNC_BASE_URL', () => {
    expect(cloudSyncClient.isConfigured()).toBe(false);
  });

  it('still resolves through the Result boundary when unconfigured', async () => {
    const result = await cloudSyncClient.fetchCommunityReports(TORONTO);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(isDemoSet(result.value)).toBe(true);
    }
  });

  it('never reaches the network when unconfigured', async () => {
    const spy = jest.spyOn(global, 'fetch' as never);

    await cloudSyncClient.fetchCommunityReports(TORONTO);

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
