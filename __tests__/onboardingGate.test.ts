import { createOnboardingGate } from '@/core/onboarding/onboardingGate';
import type { OnboardingStore } from '@/core/onboarding/onboardingStore';
import { err, ok, type Result } from '@/core/utils/result';

/**
 * The gate is the only thing standing between a fresh install and the OS
 * location dialog appearing on top of the welcome copy that explains why the
 * app wants a position. It caches one flag, so the interesting behaviour is all
 * in the edges: what it reports before storage has answered, what it does when
 * storage cannot answer, and whether two screens asking at once read the disk
 * twice.
 */

/** A store whose `hasCompleted` answer and call count the test controls. */
function fakeStore(answer: Result<boolean>) {
  const hasCompleted = jest.fn(async () => answer);
  return {
    store: {
      hasCompleted,
      complete: jest.fn(async () => ok(undefined)),
      reset: jest.fn(async () => ok(undefined)),
    } as OnboardingStore,
    hasCompleted,
  };
}

/** A store that never settles until the test lets it. */
function pendingStore() {
  let release!: (value: Result<boolean>) => void;
  const settled = new Promise<Result<boolean>>((resolve) => {
    release = resolve;
  });
  const hasCompleted = jest.fn(() => settled);
  return {
    store: {
      hasCompleted,
      complete: jest.fn(async () => ok(undefined)),
      reset: jest.fn(async () => ok(undefined)),
    } as OnboardingStore,
    hasCompleted,
    release,
  };
}

describe('onboarding gate', () => {
  it('reports unknown until something asks, so no screen guesses from a default', () => {
    const { store } = fakeStore(ok(true));

    expect(createOnboardingGate(store).get()).toBe('unknown');
  });

  it('does not touch storage just by being created', () => {
    const { store, hasCompleted } = fakeStore(ok(true));

    createOnboardingGate(store);

    expect(hasCompleted).not.toHaveBeenCalled();
  });

  it('resolves to pending while the welcome flow is unfinished', async () => {
    const { store } = fakeStore(ok(false));
    const gate = createOnboardingGate(store);

    await expect(gate.refresh()).resolves.toBe('pending');
    expect(gate.get()).toBe('pending');
  });

  it('resolves to completed once the flow is behind us', async () => {
    const { store } = fakeStore(ok(true));
    const gate = createOnboardingGate(store);

    await expect(gate.refresh()).resolves.toBe('completed');
    expect(gate.get()).toBe('completed');
  });

  /**
   * Failing closed here would be the worse bug: a device whose storage cannot
   * answer would never reach a state where the app asks for a position at all.
   * This mirrors the root layout, which also falls through to the app.
   */
  it('fails open, so a storage error never traps someone short of the permission ask', async () => {
    const { store } = fakeStore(err('storage', 'disk on fire'));
    const gate = createOnboardingGate(store);

    await expect(gate.refresh()).resolves.toBe('completed');
  });

  it('shares one storage read between concurrent callers', async () => {
    const { store, hasCompleted } = fakeStore(ok(true));
    const gate = createOnboardingGate(store);

    const [a, b] = await Promise.all([gate.refresh(), gate.refresh()]);

    expect(hasCompleted).toHaveBeenCalledTimes(1);
    expect([a, b]).toEqual(['completed', 'completed']);
  });

  it('reads again on a later refresh, rather than caching the in-flight promise forever', async () => {
    const { store, hasCompleted } = fakeStore(ok(true));
    const gate = createOnboardingGate(store);

    await gate.refresh();
    await gate.refresh();

    expect(hasCompleted).toHaveBeenCalledTimes(2);
  });

  it('stays unknown while the read is still outstanding', async () => {
    const { store, release } = pendingStore();
    const gate = createOnboardingGate(store);

    const pending = gate.refresh();
    expect(gate.get()).toBe('unknown');

    release(ok(false));
    await pending;

    expect(gate.get()).toBe('pending');
  });

  it('notifies subscribers when the value changes', async () => {
    const { store } = fakeStore(ok(false));
    const gate = createOnboardingGate(store);
    const listener = jest.fn();
    gate.subscribe(listener);

    await gate.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  /**
   * `useSyncExternalStore` re-renders on every notification, so notifying when
   * nothing changed would re-render every subscribed screen on each refresh.
   */
  it('stays quiet when a refresh produces the same value', async () => {
    const { store } = fakeStore(ok(true));
    const gate = createOnboardingGate(store);
    const listener = jest.fn();
    gate.subscribe(listener);

    await gate.refresh();
    await gate.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying once a subscriber unsubscribes', async () => {
    const { store } = fakeStore(ok(false));
    const gate = createOnboardingGate(store);
    const listener = jest.fn();

    gate.subscribe(listener)();
    await gate.refresh();

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps two subscribers in step', async () => {
    const { store } = fakeStore(ok(false));
    const gate = createOnboardingGate(store);
    const first = jest.fn();
    const second = jest.fn();
    gate.subscribe(first);
    gate.subscribe(second);

    await gate.refresh();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('gives each instance its own state, so one screen cannot leak into another test', async () => {
    const { store: doneStore } = fakeStore(ok(true));
    const { store: freshStore } = fakeStore(ok(false));

    const done = createOnboardingGate(doneStore);
    const fresh = createOnboardingGate(freshStore);
    await Promise.all([done.refresh(), fresh.refresh()]);

    expect(done.get()).toBe('completed');
    expect(fresh.get()).toBe('pending');
  });
});
