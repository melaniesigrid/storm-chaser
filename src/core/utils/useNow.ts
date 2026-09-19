import { useEffect, useState } from 'react';

/**
 * The current time, as state that actually ticks.
 *
 * `Date.now()` read during render is impure, and React may render a component
 * twice and keep either result. It is also quietly wrong for anything that has
 * to go stale on its own: a value computed from `Date.now()` in render only
 * updates when something ELSE causes a re-render, so a screen left open shows
 * data as fresh indefinitely and then jumps to stale the moment an unrelated
 * state change happens to come along.
 *
 * Holding the clock in state fixes both. The interval is the resolution the
 * caller needs, not a frame rate: a staleness banner wants tens of seconds.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
