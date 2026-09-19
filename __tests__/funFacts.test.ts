import { FUN_FACTS, factsFor, nextFact } from '@/features/weather/model/funFacts';

describe('fun facts', () => {
  it('gives every fact a unique id', () => {
    const ids = FUN_FACTS.map((fact) => fact.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * A fact that fits the sky is the entire point of tapping Volt during a
   * storm. Tagged facts lead; the untagged ones follow in their written order.
   */
  it('puts the facts about the current condition first', () => {
    const pool = factsFor('thunderstorm');
    const tagged = FUN_FACTS.filter((fact) => fact.groups?.includes('thunderstorm'));

    expect(pool.slice(0, tagged.length)).toEqual(tagged);
    expect(tagged.length).toBeGreaterThan(0);
  });

  /** Reordered, never filtered: a rare condition still gets the whole deck. */
  it('keeps every fact in the pool whatever the weather', () => {
    for (const group of ['clear', 'hail', 'unknown'] as const) {
      expect(factsFor(group)).toHaveLength(FUN_FACTS.length);
    }
  });

  it('opens with the fact that best fits the weather', () => {
    expect(nextFact('snow', null).groups).toContain('snow');
  });

  /**
   * The reason this is a rotation rather than a random draw: two taps in a row
   * must never land on the same fact.
   */
  it('never repeats the fact already on screen', () => {
    let current: string | null = null;

    for (let tap = 0; tap < FUN_FACTS.length * 2; tap += 1) {
      const fact = nextFact('rain', current);
      expect(fact.id).not.toBe(current);
      current = fact.id;
    }
  });

  it('wraps back to the start once every fact has been seen', () => {
    const seen: string[] = [];
    let current: string | null = null;

    for (let tap = 0; tap < FUN_FACTS.length; tap += 1) {
      current = nextFact('fog', current).id;
      seen.push(current);
    }

    expect(new Set(seen).size).toBe(FUN_FACTS.length);
    expect(nextFact('fog', current).id).toBe(seen[0]);
  });
});
