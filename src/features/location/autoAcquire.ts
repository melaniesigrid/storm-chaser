import type { OnboardingGate } from '@/core/onboarding/onboardingGate';

export interface AutoAcquireInput {
  /** Whether the calling screen wants a fix as soon as it is open. */
  auto: boolean;
  /** Whether the welcome flow is behind us. */
  gate: OnboardingGate;
}

/**
 * Whether `useDeviceLocation` may acquire a fix without anyone pressing
 * anything — which on a device means firing the OS permission dialog.
 *
 * Two independent conditions, both of which have burned us:
 *
 * - The caller has to want it. Onboarding's location primer holds the hook so
 *   it can show the outcome, but the whole point of that screen is that the
 *   dialog waits for the button.
 * - The welcome flow has to be finished. On first launch the Conditions tab
 *   mounts before the root layout's redirect to `/onboarding` lands, so an
 *   unconditional acquire put the OS dialog over the step-0 welcome screen —
 *   before the user had read a word about why, and leaving the primer's two
 *   buttons decorative because the permission was already answered.
 *
 * `unknown` (the flag has not come back from storage yet) blocks too: waiting a
 * few milliseconds is free, and guessing wrong is the bug above.
 */
export function shouldAutoAcquire({ auto, gate }: AutoAcquireInput): boolean {
  return auto && gate === 'completed';
}
