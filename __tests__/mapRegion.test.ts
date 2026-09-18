import { boundingRegion } from '@/features/storms/model/mapRegion';
import type { StormReport } from '@/features/storms/model/types';

/** A report is only ever read for its coordinates here, so the rest is noise. */
function at(coordinates: { latitude: number; longitude: number } | null): StormReport {
  return { coordinates } as StormReport;
}

const TORONTO = { latitude: 43.6532, longitude: -79.3832 };

describe('boundingRegion', () => {
  it('has nothing to fit when the log is empty', () => {
    expect(boundingRegion([])).toBeUndefined();
  });

  /**
   * A report captured before a fix resolved carries null coordinates. It is
   * still in the log and still listed, it just cannot be plotted, and it must
   * not drag the region to the Gulf of Guinea by being read as 0, 0.
   */
  it('ignores reports that never got a position', () => {
    expect(boundingRegion([at(null), at(null)])).toBeUndefined();
  });

  it('skips the unplottable reports but still fits the rest', () => {
    const region = boundingRegion([at(null), at(TORONTO), at(null)]);

    expect(region?.latitude).toBeCloseTo(TORONTO.latitude, 6);
    expect(region?.longitude).toBeCloseTo(TORONTO.longitude, 6);
  });

  /**
   * One pin has no span, so the deltas fall back to the 0.05 degree floor.
   * Without it the map would be asked to zoom infinitely into a single point.
   */
  it('centres on a single pin at the minimum zoom span', () => {
    const region = boundingRegion([at(TORONTO)]);

    expect(region).toEqual({
      latitude: TORONTO.latitude,
      longitude: TORONTO.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  });

  it('applies the same floor when every pin is in the same place', () => {
    const region = boundingRegion([at(TORONTO), at(TORONTO), at(TORONTO)]);

    expect(region?.latitudeDelta).toBe(0.05);
    expect(region?.longitudeDelta).toBe(0.05);
  });

  it('centres between the extremes and pads the span by 60 percent', () => {
    const region = boundingRegion([
      at({ latitude: 40, longitude: -80 }),
      at({ latitude: 50, longitude: -70 }),
    ]);

    expect(region?.latitude).toBe(45);
    expect(region?.longitude).toBe(-75);
    expect(region?.latitudeDelta).toBeCloseTo(16, 6);
    expect(region?.longitudeDelta).toBeCloseTo(16, 6);
  });

  it('is unmoved by the order the reports arrive in', () => {
    const points = [
      at({ latitude: 40, longitude: -80 }),
      at({ latitude: 50, longitude: -70 }),
      at({ latitude: 45, longitude: -75 }),
    ];

    expect(boundingRegion(points)).toEqual(boundingRegion([...points].reverse()));
  });

  it('opens wide enough to hold a chase across half a continent', () => {
    const region = boundingRegion([
      at({ latitude: 32, longitude: -104 }),
      at({ latitude: 44, longitude: -90 }),
    ]);

    // The padded span has to cover the raw one, or a pin sits off screen.
    expect(region?.longitudeDelta).toBeGreaterThan(14);
    expect(region?.latitudeDelta).toBeGreaterThan(12);
  });

  /**
   * Known limitation, asserted rather than assumed. Two pins either side of
   * the antimeridian are 2 degrees apart on the globe, but min/max longitude
   * describes them as 358 degrees apart, so the map opens on the whole world
   * centred on Africa instead of on the Pacific. Chasers do not straddle the
   * date line in one session, so this is left as it is — but if that changes,
   * this test is where it will be noticed.
   */
  it('spans the long way round when reports straddle the antimeridian', () => {
    const region = boundingRegion([
      at({ latitude: 0, longitude: 179 }),
      at({ latitude: 0, longitude: -179 }),
    ]);

    expect(region?.longitude).toBe(0);
    expect(region?.longitudeDelta).toBeCloseTo(572.8, 5);
  });

  it('never returns a delta below the floor, whatever the input', () => {
    const region = boundingRegion([
      at({ latitude: 43.65321, longitude: -79.38321 }),
      at({ latitude: 43.65322, longitude: -79.38322 }),
    ]);

    expect(region?.latitudeDelta).toBe(0.05);
    expect(region?.longitudeDelta).toBe(0.05);
  });
});
