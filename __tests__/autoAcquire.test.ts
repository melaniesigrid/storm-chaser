import { createOnboardingGate, type OnboardingGate } from '@/core/onboarding/onboardingGate';
import type { OnboardingStore } from '@/core/onboarding/onboardingStore';
import { shouldAutoAcquire } from '@/features/location/autoAcquire';
import { err, ok, type Result } from '@/core/utils/result';

const GATES: OnboardingGate[] = ['unknown', 'pending', 'completed'];

function stubStore(hasCompleted: () => Promise<Result<boolean>>): OnboardingStore {
  return {
    hasCompleted,
    complete: async () => ok(undefined),
    reset: async () => ok(undefined),
  };
}

describe('shouldAutoAcquire', () => {
  it('acquires once the welcome flow is behind us', () => {
    expect(shouldAutoAcquire({ auto: true, gate: 'completed' })).toBe(true);
  });

  /**
   * The defect this predicate exists for: the Conditions tab mounts before the
   * redirect to onboarding lands, so an unconditional acquire put the OS
   * permission dialog over the welcome screen.
   */
  it('waits while the welcome flow is unfinished or unread', () => {
    expect(shouldAutoAcquire({ auto: true, gate: 'pending' })).toBe(false);
    expect(shouldAutoAcquire({ auto: true, gate: 'unknown' })).toBe(false);
  });

  it('never acquires for a caller that opted out, whatever the gate says', () => {
    for (const gate of GATES) {
      expect(shouldAutoAcquire({ auto: false, gate })).toBe(false);
    }
  });
});

describe('onboardingGate', () => {
  it('starts unknown, before anything has been read', () => {
    const gate = createOnboardingGate(stubStore(async () => ok(true)));

    expect(gate.get()).toBe('unknown');
  });

  it('resolves to pending on first launch', async () => {
    const gate = createOnboardingGate(stubStore(async () => ok(false)));

    await gate.refresh();

    expect(gate.get()).toBe('pending');
  });

  it('resolves to completed for a returning user', async () => {
    const gate = createOnboardingGate(stubStore(async () => ok(true)));

    await gate.refresh();

    expect(gate.get()).toBe('completed');
  });

  /**
   * Matches the root layout, which falls through to the app rather than
   * trapping someone in onboarding when storage cannot answer. Failing the
   * other way would mean an app that never asks for a position at all.
   */
  it('fails open when storage cannot answer', async () => {
    const gate = createOnboardingGate(stubStore(async () => err('storage', 'nope')));

    await gate.refresh();

    expect(gate.get()).toBe('completed');
  });

  it('notifies subscribers only when the answer changes', async () => {
    const gate = createOnboardingGate(stubStore(async () => ok(true)));
    const listener = jest.fn();
    gate.subscribe(listener);

    await gate.refresh();
    await gate.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('shares one read between concurrent callers', async () => {
    const hasCompleted = jest.fn(async () => ok(true));
    const gate = createOnboardingGate(stubStore(hasCompleted));

    await Promise.all([gate.refresh(), gate.refresh(), gate.refresh()]);

    expect(hasCompleted).toHaveBeenCalledTimes(1);
  });

  it('re-reads after a refresh has settled, so finishing onboarding takes effect', async () => {
    let completed = false;
    const gate = createOnboardingGate(stubStore(async () => ok(completed)));

    await gate.refresh();
    expect(gate.get()).toBe('pending');

    completed = true;
    await gate.refresh();

    expect(gate.get()).toBe('completed');
  });

  it('stops notifying a listener that unsubscribed', async () => {
    let completed = false;
    const gate = createOnboardingGate(stubStore(async () => ok(completed)));
    const listener = jest.fn();

    gate.subscribe(listener)();

    completed = true;
    await gate.refresh();

    expect(listener).not.toHaveBeenCalled();
  });
});
