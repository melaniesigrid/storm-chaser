import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import {
  publishLastKnownPosition,
  useLastKnownPosition,
} from '@/features/location/lastKnownPosition';
import type { Coordinates } from '@/features/weather/model/types';

/**
 * The shared fix is module state by design (see the doc comment on the
 * module), so each test starts from a fresh copy rather than inheriting
 * whatever the previous one published.
 */
type Module = typeof import('@/features/location/lastKnownPosition');

function freshModule(): Module {
  let mod!: Module;
  jest.isolateModules(() => {
    mod = require('@/features/location/lastKnownPosition') as Module;
  });
  return mod;
}

const TORONTO: Coordinates = { latitude: 43.6532, longitude: -79.3832 };
const SYDNEY: Coordinates = { latitude: -33.8688, longitude: 151.2093 };

describe('lastKnownPosition', () => {
  it('is null until a screen has published a fix', () => {
    const { getLastKnownPosition } = freshModule();

    expect(getLastKnownPosition()).toBeNull();
  });

  it('hands back the fix a screen published', () => {
    const { publishLastKnownPosition, getLastKnownPosition } = freshModule();

    publishLastKnownPosition(TORONTO);

    expect(getLastKnownPosition()).toEqual(TORONTO);
  });

  /**
   * A hook still in its `requesting` state, or a screen whose permission was
   * denied, reports null. Storing that would blank a fix the map already holds
   * and drop the legend screen back to "position unknown".
   */
  it('ignores null rather than clearing a good fix', () => {
    const { publishLastKnownPosition, getLastKnownPosition } = freshModule();

    publishLastKnownPosition(TORONTO);
    publishLastKnownPosition(null);

    expect(getLastKnownPosition()).toEqual(TORONTO);
  });

  it('ignores null before anything has ever been published', () => {
    const { publishLastKnownPosition, getLastKnownPosition } = freshModule();

    publishLastKnownPosition(null);

    expect(getLastKnownPosition()).toBeNull();
  });

  /**
   * `useSyncExternalStore` compares snapshots by identity, so republishing an
   * equal-but-distinct object has to keep the stored reference. Swapping it
   * would hand React a new snapshot on every location tick and re-render every
   * subscribed screen for a position that has not moved.
   */
  it('keeps the stored reference when the same coordinates arrive again', () => {
    const { publishLastKnownPosition, getLastKnownPosition } = freshModule();

    publishLastKnownPosition(TORONTO);
    const first = getLastKnownPosition();
    publishLastKnownPosition({ ...TORONTO });

    expect(getLastKnownPosition()).toBe(first);
  });

  it('replaces the fix once the chaser has actually moved', () => {
    const { publishLastKnownPosition, getLastKnownPosition } = freshModule();

    publishLastKnownPosition(TORONTO);
    publishLastKnownPosition(SYDNEY);

    expect(getLastKnownPosition()).toEqual(SYDNEY);
  });

  it('treats a change in longitude alone as a move', () => {
    const { publishLastKnownPosition, getLastKnownPosition } = freshModule();

    publishLastKnownPosition(TORONTO);
    const moved = { latitude: TORONTO.latitude, longitude: TORONTO.longitude + 0.5 };
    publishLastKnownPosition(moved);

    expect(getLastKnownPosition()).toEqual(moved);
  });

  it('treats a change in latitude alone as a move', () => {
    const { publishLastKnownPosition, getLastKnownPosition } = freshModule();

    publishLastKnownPosition(TORONTO);
    const moved = { latitude: TORONTO.latitude + 0.5, longitude: TORONTO.longitude };
    publishLastKnownPosition(moved);

    expect(getLastKnownPosition()).toEqual(moved);
  });

  it('starts from null again in a fresh module, so the state is not global for ever', () => {
    const first = freshModule();
    first.publishLastKnownPosition(TORONTO);

    expect(freshModule().getLastKnownPosition()).toBeNull();
  });
});

/**
 * The half of the module the getter cannot reach.
 *
 * `subscribe` and the listener set are private, so the only way to prove a
 * published fix actually reaches a mounted screen is to mount one. This is a
 * hook, not a view: the probe renders null, touches no native component and
 * needs no renderer beyond `react-test-renderer`, which the project already
 * depends on. Without this, a `publishLastKnownPosition` that stored the fix
 * but never called its listeners would pass every test above and still leave
 * the legend screen reading "Position unknown" until something else re-rendered
 * it.
 *
 * These use the statically imported module rather than `freshModule`, because
 * an isolated registry hands the module its own copy of React and the renderer
 * then dispatches hooks against a different one. The cost is shared state, so
 * every test below publishes its own distinct fix and asserts on what the
 * probe saw rather than on an absolute starting value.
 */
describe('useLastKnownPosition', () => {
  /** Renders the hook and records every value it saw, newest last. */
  function mountProbe() {
    const seen: Array<Coordinates | null> = [];

    function Probe() {
      seen.push(useLastKnownPosition());
      return null;
    }

    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(createElement(Probe));
    });

    return { seen, unmount: () => act(() => tree.unmount()) };
  }

  const latest = (seen: Array<Coordinates | null>) => seen[seen.length - 1];

  it('reads the fix that was already published before it mounted', () => {
    publishLastKnownPosition(TORONTO);

    const { seen, unmount } = mountProbe();

    expect(seen).toEqual([TORONTO]);
    unmount();
  });

  it('re-renders the screen when a fix arrives after it mounted', () => {
    const { seen, unmount } = mountProbe();

    act(() => {
      publishLastKnownPosition(SYDNEY);
    });

    expect(latest(seen)).toEqual(SYDNEY);
    unmount();
  });

  /**
   * The identity guard, seen from the subscriber's side. Republishing an equal
   * fix must not hand React a new snapshot, or every location tick re-renders
   * every subscribed screen for a chaser who has not moved.
   */
  it('does not re-render for coordinates that have not changed', () => {
    publishLastKnownPosition(TORONTO);
    const { seen, unmount } = mountProbe();
    const renders = seen.length;

    act(() => {
      publishLastKnownPosition({ ...TORONTO });
      publishLastKnownPosition(null);
    });

    expect(seen).toHaveLength(renders);
    unmount();
  });

  /**
   * Unsubscribing has to actually remove the listener. A leaked one is a
   * setState on an unmounted component on every later fix — and the set grows
   * for the life of the process, so it is a leak as well as a warning.
   */
  it('stops listening once the screen unmounts', () => {
    publishLastKnownPosition(TORONTO);
    const { seen, unmount } = mountProbe();
    unmount();

    const renders = seen.length;
    act(() => {
      publishLastKnownPosition(SYDNEY);
    });

    expect(seen).toHaveLength(renders);
  });

  it('keeps two mounted screens on the same fix', () => {
    publishLastKnownPosition(TORONTO);
    const first = mountProbe();
    const second = mountProbe();

    act(() => {
      publishLastKnownPosition(SYDNEY);
    });

    expect(latest(first.seen)).toEqual(SYDNEY);
    expect(latest(second.seen)).toEqual(SYDNEY);

    first.unmount();
    second.unmount();
  });
});
