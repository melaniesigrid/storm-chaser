import { eraseAccount } from '@/core/account/eraseAccount';
import { err, ok } from '@/core/utils/result';

/**
 * Deleting the account is the one action in the app that cannot be undone and
 * has no server to fall back on, so what is asserted here is that every store
 * is asked — including after one of them fails — and that a failure is still
 * reported rather than swallowed behind a screen that says it is all gone.
 */
function spies() {
  return {
    reports: { clear: jest.fn(async () => ok(undefined)) },
    deletePhotos: jest.fn(async () => ok(true)),
    profile: { clear: jest.fn(async () => ok(undefined)) },
    theme: { clear: jest.fn(async () => ok(undefined)) },
    onboarding: { reset: jest.fn(async () => ok(undefined)) },
    cache: { clear: jest.fn() },
    persistedCache: { removeClient: jest.fn(async () => {}) },
  };
}

describe('eraseAccount', () => {
  it('clears every store, the photos and both copies of the query cache', async () => {
    const deps = spies();

    await expect(eraseAccount(deps)).resolves.toEqual(ok(undefined));

    expect(deps.deletePhotos).toHaveBeenCalled();
    expect(deps.reports.clear).toHaveBeenCalled();
    expect(deps.profile.clear).toHaveBeenCalled();
    expect(deps.theme.clear).toHaveBeenCalled();
    expect(deps.onboarding.reset).toHaveBeenCalled();
    expect(deps.cache.clear).toHaveBeenCalled();
    expect(deps.persistedCache.removeClient).toHaveBeenCalled();
  });

  it('finishes the erase after a failing step and reports the failure', async () => {
    const deps = spies();
    deps.reports.clear.mockResolvedValue(err('storage', 'nope'));

    const result = await eraseAccount(deps);

    expect(result.ok).toBe(false);
    expect(deps.profile.clear).toHaveBeenCalled();
    expect(deps.onboarding.reset).toHaveBeenCalled();
    expect(deps.cache.clear).toHaveBeenCalled();
  });

  it('treats a store that throws as a failure rather than a crash', async () => {
    const deps = spies();
    deps.profile.clear.mockRejectedValue(new Error('boom'));

    const result = await eraseAccount(deps);

    expect(result.ok).toBe(false);
    expect(deps.onboarding.reset).toHaveBeenCalled();
  });
});
