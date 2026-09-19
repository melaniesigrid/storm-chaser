import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { moonGeometry, moonPhase } from '@/core/sky/moonPhase';

/**
 * The landing page's moon must agree with the app's.
 *
 * landing/index.html carries its own port of src/core/sky/moonPhase.ts,
 * because it is static HTML with no build step and no way to import from
 * src/. Duplicated astronomy is exactly the kind of thing that silently
 * diverges -- one copy gets a fix, the other keeps shipping, and nobody
 * notices because both produce a plausible-looking moon.
 *
 * So this runs the real script out of the real HTML file, over the same
 * instants as the app's implementation, and fails if the two disagree about
 * either which limb is lit or how the terminator bows.
 */

const HTML = resolve(__dirname, '../landing/index.html');

/** Pull the moon IIFE out of the page and run it against a stub element. */
function drawOnLanding(dates: Date[]): string[] {
  const html = readFileSync(HTML, 'utf8');

  const marker = "var path = document.getElementById('landing-moon');";
  const start = html.lastIndexOf('<script>', html.indexOf(marker));
  const end = html.indexOf('</script>', start);

  if (start === -1 || end === -1) {
    throw new Error('the landing moon script is no longer in landing/index.html');
  }

  const script = html.slice(start + '<script>'.length, end);

  const drawn: string[] = [];
  const element = {
    setAttribute(name: string, value: string) {
      if (name === 'd') drawn.push(value);
    },
  };

  /*
   * The script draws once for `new Date()` and then on an interval. Both are
   * stubbed: the clock is pinned per instant so the comparison is exact, and
   * setInterval is swallowed so the test does not leave a timer running.
   */
  const run = new Function(
    'document',
    'setInterval',
    'Date',
    `${script}\n//# sourceURL=landing-moon.js`,
  );

  return dates.map((date) => {
    drawn.length = 0;

    class PinnedDate extends global.Date {
      constructor() {
        super(date.getTime());
      }
    }

    run(
      { getElementById: (id: string) => (id === 'landing-moon' ? element : null) },
      () => 0,
      PinnedDate,
    );

    if (drawn.length === 0) throw new Error(`the landing script drew nothing for ${date}`);
    return drawn[0]!;
  });
}

/** Read the limb sweep and terminator radius back out of the path. */
function parsePath(d: string) {
  const match =
    /^M 0 (-?[\d.]+) A ([\d.]+) ([\d.]+) 0 0 ([01]) 0 ([\d.]+) A ([\d.e-]+) ([\d.]+) 0 0 ([01]) 0 (-?[\d.]+) Z$/.exec(
      d,
    );
  if (!match) throw new Error(`the landing path is not the shape this test knows: ${d}`);

  return {
    radius: Number(match[2]),
    limbSweep: Number(match[4]),
    terminatorRadius: Number(match[6]),
    terminatorSweep: Number(match[8]),
  };
}

/** A month of instants, so the comparison covers every phase. */
const INSTANTS = Array.from(
  { length: 30 },
  (_, day) => new Date(Date.UTC(2026, 2, 1 + day, 22, 0)),
);

describe('the landing page moon', () => {
  const drawn = drawOnLanding(INSTANTS);

  it('draws a moon for every night of a month', () => {
    expect(drawn).toHaveLength(INSTANTS.length);
    for (const d of drawn) expect(d).toMatch(/^M 0 /);
  });

  it('lights the same limb as the app', () => {
    // limbSweep 1 is the right limb, matching litPath in src/core/sky/Moon.tsx.
    INSTANTS.forEach((instant, index) => {
      const expected = moonGeometry(moonPhase(instant));
      const actual = parsePath(drawn[index]!);
      expect(actual.limbSweep === 1).toBe(expected.litOnRight);
    });
  });

  it('bows the terminator the same way as the app', () => {
    INSTANTS.forEach((instant, index) => {
      const expected = moonGeometry(moonPhase(instant));
      const actual = parsePath(drawn[index]!);

      // The path carries |terminator| scaled by the radius; the sign lives in
      // the sweep flag, so both halves are compared separately.
      expect(actual.terminatorRadius / actual.radius).toBeCloseTo(
        Math.abs(expected.terminator),
        3,
      );

      const bowsTowardLitSide = expected.terminator > 0;
      const expectedSweep = expected.litOnRight
        ? bowsTowardLitSide
          ? 0
          : 1
        : bowsTowardLitSide
          ? 1
          : 0;
      expect(actual.terminatorSweep).toBe(expectedSweep);
    });
  });

  it('is wired to artwork that has had its crescent removed', () => {
    // The port being correct is worth nothing if the page still stacks it on
    // the original glyph: that renders two moons at different phases.
    const html = readFileSync(HTML, 'utf8');
    expect(html).toContain('icons/starry-night-moonless.svg');
    expect(html).not.toContain('<img src="icons/starry-night.svg"');
  });

  it('ships the moonless artwork it points at', () => {
    const svg = readFileSync(
      resolve(__dirname, '../landing/icons/starry-night-moonless.svg'),
      'utf8',
    );
    expect(svg).not.toMatch(/id="Moon/);
    expect(svg).toContain('<svg');
  });
});
