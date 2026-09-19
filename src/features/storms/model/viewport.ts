import type { Coordinates } from '@/features/weather/model/types';

/**
 * Which pins are worth mounting.
 *
 * Every stored report, every community report and all twenty-two legends used
 * to mount a native marker view at once, whatever the map was actually
 * showing. Twenty-two is fine. A chaser with three hundred logged reports
 * mounts three hundred marker views, on top of the community layer, and pays
 * for all of them on every pan.
 *
 * Two bounds, because one is not enough. The viewport drops what is off
 * screen, which is the common case: zoomed into one storm, the other
 * continents are not drawn. The cap catches the other case, where the map is
 * zoomed out far enough that everything IS on screen and the viewport filter
 * lets all three hundred through.
 *
 * Pure, so it is unit tested rather than eyeballed on a device, and it lives
 * in `model/` rather than beside the screen for the same reason `dayLabel`
 * does: importing the map screen pulls in `react-native-maps`, which is native
 * only and cannot load in the test runner.
 */

/** The shape `react-native-maps` reports, kept local so this file imports nothing native. */
export interface Viewport {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * How much bigger than the visible box to treat as visible.
 *
 * Culling exactly to the edge makes pins pop into existence under the user's
 * thumb as they pan. A quarter of a screen of margin on each side means the
 * next pin is already mounted by the time it slides into view.
 */
export const VIEWPORT_PAD = 1.5;

/**
 * The most markers of one kind that may be mounted at once.
 *
 * Not a performance measurement, a ceiling: past this many pins in one frame
 * the map is unreadable anyway, so the cheap thing and the legible thing agree.
 */
export const MAX_MARKERS = 60;

/**
 * Longitude difference in degrees, the short way round.
 *
 * A chaser standing at 179.9 East and a report at 179.9 West are 0.2 degrees
 * apart, not 359.8. Plain subtraction puts the whole Pacific between them and
 * culls every pin on the far side of the antimeridian.
 */
export function longitudeDelta(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/** Whether a coordinate falls inside the padded viewport. */
export function isVisible(viewport: Viewport, coordinate: Coordinates): boolean {
  const latHalf = (Math.abs(viewport.latitudeDelta) * VIEWPORT_PAD) / 2;
  const lonHalf = (Math.abs(viewport.longitudeDelta) * VIEWPORT_PAD) / 2;

  if (Math.abs(coordinate.latitude - viewport.latitude) > latHalf) return false;

  // A viewport wider than the world contains every longitude there is, and the
  // short-way-round measure caps at 180, so without this a zoomed-all-the-way-
  // out map would cull the half of the world furthest from its centre.
  if (lonHalf >= 180) return true;

  return longitudeDelta(coordinate.longitude, viewport.longitude) <= lonHalf;
}

/**
 * The markers to mount, viewport-culled and capped.
 *
 * With no viewport yet (the first frame, before the map has reported a region)
 * the cap still applies. Rendering everything "just until the first region
 * callback" is the unbounded mount this exists to prevent, and that first
 * frame is the one that decides whether the screen feels instant.
 *
 * Over the cap, the ones nearest the centre of the map win: the pins the
 * reader is looking at survive, and the ones at the edge are the ones that go.
 * Order is otherwise preserved, so a list that fits comes back untouched and
 * the marker diff sees no movement.
 */
export function visibleMarkers<T>(
  items: readonly T[],
  coordinateOf: (item: T) => Coordinates | null,
  viewport: Viewport | undefined,
  max: number = MAX_MARKERS,
): T[] {
  const placed = items.filter((item) => coordinateOf(item) !== null);

  const inView = viewport
    ? placed.filter((item) => isVisible(viewport, coordinateOf(item) as Coordinates))
    : placed;

  if (inView.length <= max) return inView;
  if (!viewport) return inView.slice(0, max);

  // Rank by distance from the centre, then restore the original order, so the
  // cap changes which markers are mounted but never the order they mount in.
  const nearest = new Set(
    [...inView]
      .sort((a, b) => centreDistance(viewport, coordinateOf(a) as Coordinates)
        - centreDistance(viewport, coordinateOf(b) as Coordinates))
      .slice(0, max),
  );

  return inView.filter((item) => nearest.has(item));
}

/**
 * Squared degrees from the centre of the viewport. Not a real distance and it
 * does not need to be: it only ever orders one list against one centre, and a
 * square root on every marker on every pan buys nothing.
 */
function centreDistance(viewport: Viewport, coordinate: Coordinates): number {
  const lat = coordinate.latitude - viewport.latitude;
  const lon = longitudeDelta(coordinate.longitude, viewport.longitude);

  return lat * lat + lon * lon;
}
