import {
  MAX_MARKERS,
  VIEWPORT_PAD,
  isVisible,
  longitudeDelta,
  visibleMarkers,
  type Viewport,
} from '@/features/storms/model/viewport';
import type { Coordinates } from '@/features/weather/model/types';

/** Toronto, about two degrees of map on each axis. */
const TORONTO: Viewport = {
  latitude: 43.65,
  longitude: -79.38,
  latitudeDelta: 2,
  longitudeDelta: 2,
};

const at = (latitude: number, longitude: number): Coordinates => ({ latitude, longitude });

interface Pin {
  id: string;
  coordinates: Coordinates | null;
}

const pin = (id: string, latitude: number, longitude: number): Pin => ({
  id,
  coordinates: at(latitude, longitude),
});

const coordinateOf = (item: Pin) => item.coordinates;

describe('longitudeDelta', () => {
  it('measures the short way round the world', () => {
    expect(longitudeDelta(10, 20)).toBe(10);
    expect(longitudeDelta(20, 10)).toBe(10);
  });

  /**
   * REGRESSION guard for the antimeridian. Plain subtraction makes these two
   * 359.8 degrees apart and puts the whole Pacific between two points you
   * could see from each other.
   */
  it('crosses the antimeridian without going the long way', () => {
    expect(longitudeDelta(179.9, -179.9)).toBeCloseTo(0.2, 6);
    expect(longitudeDelta(-179.9, 179.9)).toBeCloseTo(0.2, 6);
  });

  it('never reports more than half the world', () => {
    for (const [a, b] of [[0, 180], [0, -180], [90, -90], [-45, 135]]) {
      expect(longitudeDelta(a as number, b as number)).toBeLessThanOrEqual(180);
    }
  });
});

describe('isVisible', () => {
  it('keeps what is under the middle of the map', () => {
    expect(isVisible(TORONTO, at(43.65, -79.38))).toBe(true);
  });

  it('drops what is a continent away', () => {
    expect(isVisible(TORONTO, at(-33.87, 151.21))).toBe(false);
  });

  /**
   * The padding is the reason pins do not appear under your thumb mid-pan: a
   * marker a little outside the visible box is already mounted when it slides
   * in. Just inside the pad stays, just outside it goes.
   */
  it('mounts a little beyond the edge of the screen', () => {
    const halfPadded = (TORONTO.latitudeDelta * VIEWPORT_PAD) / 2;

    expect(isVisible(TORONTO, at(TORONTO.latitude + halfPadded * 0.95, TORONTO.longitude))).toBe(true);
    expect(isVisible(TORONTO, at(TORONTO.latitude + halfPadded * 1.05, TORONTO.longitude))).toBe(false);
  });

  it('holds a pin on the far side of the antimeridian', () => {
    const fiji: Viewport = {
      latitude: -17,
      longitude: 179.9,
      latitudeDelta: 2,
      longitudeDelta: 2,
    };

    expect(isVisible(fiji, at(-17, -179.9))).toBe(true);
  });

  it('shows the whole world when the map is zoomed out to it', () => {
    const world: Viewport = {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 180,
      longitudeDelta: 360,
    };

    // Without the wide-viewport branch the short-way-round measure caps at
    // 180, so the far side of the planet would be culled from a world view.
    expect(isVisible(world, at(0, 179))).toBe(true);
    expect(isVisible(world, at(0, -179))).toBe(true);
  });

  it('survives a negative delta rather than culling everything', () => {
    const flipped: Viewport = { ...TORONTO, latitudeDelta: -2, longitudeDelta: -2 };

    expect(isVisible(flipped, at(43.65, -79.38))).toBe(true);
  });
});

describe('visibleMarkers', () => {
  it('drops reports with no position at all', () => {
    const pins: Pin[] = [pin('a', 43.65, -79.38), { id: 'b', coordinates: null }];

    expect(visibleMarkers(pins, coordinateOf, TORONTO).map((p) => p.id)).toEqual(['a']);
  });

  it('returns a short list untouched, in its original order', () => {
    const pins = [pin('a', 43.7, -79.4), pin('b', 43.6, -79.3), pin('c', 43.65, -79.38)];

    expect(visibleMarkers(pins, coordinateOf, TORONTO).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('culls the other side of the world', () => {
    const pins = [pin('home', 43.65, -79.38), pin('sydney', -33.87, 151.21)];

    expect(visibleMarkers(pins, coordinateOf, TORONTO).map((p) => p.id)).toEqual(['home']);
  });

  /*
   * REGRESSION. Every stored report, every community report and all
   * twenty-two legends mounted a native marker view at once, whatever the map
   * was showing. Three hundred logged reports meant three hundred marker
   * views, paid for on every pan.
   */
  it('caps the mount even when everything is on screen', () => {
    const world: Viewport = {
      latitude: 0,
      longitude: 0,
      latitudeDelta: 180,
      longitudeDelta: 360,
    };
    const pins = Array.from({ length: 300 }, (_, index) =>
      pin(`p${index}`, (index % 80) - 40, ((index * 3) % 300) - 150),
    );

    expect(visibleMarkers(pins, coordinateOf, world)).toHaveLength(MAX_MARKERS);
  });

  it('caps the first frame too, before the map has reported a region', () => {
    const pins = Array.from({ length: 300 }, (_, index) => pin(`p${index}`, 43.65, -79.38));

    // Rendering everything "just until the first region callback" is the
    // unbounded mount this exists to prevent, and that frame is the one that
    // decides whether the screen feels instant.
    expect(visibleMarkers(pins, coordinateOf, undefined)).toHaveLength(MAX_MARKERS);
  });

  it('keeps the pins nearest the centre when it has to choose', () => {
    // Ten pins marching away from the centre; a cap of three must keep the
    // three closest, not the three first.
    const pins = Array.from({ length: 10 }, (_, index) =>
      pin(`p${index}`, TORONTO.latitude + (9 - index) * 0.05, TORONTO.longitude),
    );

    expect(visibleMarkers(pins, coordinateOf, TORONTO, 3).map((p) => p.id))
      .toEqual(['p7', 'p8', 'p9']);
  });

  it('preserves list order even after capping', () => {
    const pins = [
      pin('far', TORONTO.latitude + 0.4, TORONTO.longitude),
      pin('near', TORONTO.latitude, TORONTO.longitude),
      pin('middle', TORONTO.latitude + 0.2, TORONTO.longitude),
    ];

    // 'near' and 'middle' survive, but they come back in the order they were
    // given, so the marker diff sees no movement.
    expect(visibleMarkers(pins, coordinateOf, TORONTO, 2).map((p) => p.id))
      .toEqual(['near', 'middle']);
  });

  it('returns nothing for an empty list rather than throwing', () => {
    expect(visibleMarkers([], coordinateOf, TORONTO)).toEqual([]);
    expect(visibleMarkers([], coordinateOf, undefined)).toEqual([]);
  });
});
