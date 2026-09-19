import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { WCAG_MAX_FLASHES_PER_SECOND } from '@/core/theme/contrast';

/**
 * The landing page's three directions, and the flash that rides on top of one
 * of them.
 *
 * The deploy workflow guards this page, but it guards it by COUNTING -- three
 * theme blocks, three picker buttons, three display faces -- after an earlier
 * version that named the themes blocked a good deploy over a rename. Counting
 * survives a rename, which is the point, but it also survives HALF a rename:
 * rename the CSS block and not the button and the count is still three, CI is
 * still green, and the shipped picker has a button that sets a theme with no
 * styles behind it. These tests keep the two sides tied together, which is the
 * part the count cannot check.
 *
 * The flash is here for a different reason. It is full-bleed, it is new, and
 * WCAG 2.3.1 is a hard ceiling rather than a preference; a later hand tightening
 * the cadence for effect is exactly how a page acquires a seizure risk.
 */
const NEWLINE = String.fromCharCode(10);

const PAGE = readFileSync(resolve(__dirname, '../landing/index.html'), 'utf8');

/** Every theme that has a block of styles behind it. */
function styledThemes(): string[] {
  const found = new Set<string>();
  for (const [, name] of PAGE.matchAll(/html\[data-theme="([a-z-]+)"\]/g)) {
    found.add(name!);
  }
  return [...found].sort();
}

/** Every theme the picker offers. */
function pickedThemes(): string[] {
  return [...PAGE.matchAll(/<button[^>]*\bdata-set="([a-z-]+)"/g)].map((m) => m[1]!).sort();
}

/** The body of a named @keyframes rule. */
function keyframes(name: string): string {
  const head = `@keyframes ${name}`;
  const at = PAGE.indexOf(head);
  if (at === -1) throw new Error(`no ${head} in landing/index.html`);

  const open = PAGE.indexOf('{', at);
  const close = PAGE.indexOf(NEWLINE + '  }', open);
  if (open === -1 || close === -1) throw new Error(`${head} is not a closed block`);

  return PAGE.slice(open + 1, close);
}

describe('the landing page picker', () => {
  it('offers exactly the themes it has styles for', () => {
    // The half-rename the counting deploy guard cannot see.
    expect(pickedThemes()).toEqual(styledThemes());
  });

  it('still draws three directions', () => {
    expect(styledThemes()).toHaveLength(3);
  });

  it('boots into a theme the picker knows about', () => {
    const boot = /<html[^>]*\bdata-theme="([a-z-]+)"/.exec(PAGE);

    expect(boot).not.toBeNull();
    expect(pickedThemes()).toContain(boot![1]);
  });

  it('presses exactly the button it booted into', () => {
    const boot = /<html[^>]*\bdata-theme="([a-z-]+)"/.exec(PAGE)![1];
    const pressed = [...PAGE.matchAll(/<button[^>]*\bdata-set="([a-z-]+)"[^>]*aria-pressed="true"/g)];

    expect(pressed.map((m) => m[1])).toEqual([boot]);
  });

  it('carries the three display faces the directions are drawn in', () => {
    for (const face of ['Anton', 'Bricolage Grotesque', 'Big Shoulders']) {
      expect(PAGE).toContain(face);
    }
  });

  it('offers exactly three distinct directions, which is what the deploy guard counts', () => {
    // The workflow reads the switcher with `grep -o ... | sort -u` and fails
    // unless it finds three distinct names. Add a fourth or drop to two and the
    // deploy blocks, so the page and the guard have to agree on the number.
    const distinct = new Set(pickedThemes());

    expect(distinct.size).toBe(3);
  });
});

describe('the full-bleed flash', () => {
  it('stays under the WCAG 2.3.1 general flash ceiling', () => {
    const duration = Number(/animation:\s*skyflash\s+([\d.]+)s/.exec(PAGE)![1]);
    expect(duration).toBeGreaterThan(0);

    const peaks = [...keyframes('skyflash').matchAll(/([\d.]+)%\s*\{\s*opacity:\s*calc\(/g)].map(
      (m) => (Number(m[1]) / 100) * duration,
    );
    expect(peaks.length).toBeGreaterThan(0);

    // The worst rolling one-second window, including the wrap into the next
    // cycle -- a cadence can be safe inside one loop and unsafe across the seam.
    const twoCycles = [...peaks, ...peaks.map((t) => t + duration)];
    const worst = Math.max(
      ...twoCycles.map((start) => twoCycles.filter((t) => t >= start && t < start + 1).length),
    );

    expect(worst).toBeLessThan(WCAG_MAX_FLASHES_PER_SECOND);
  });

  it('is off unless a direction keys it on, and off when none says', () => {
    // Every lit stop multiplies by --flash-on, whose fallback is 0, so a theme
    // that never mentions the flash resolves the whole animation to nothing
    // rather than needing a rule that names it.
    const lit = [...keyframes('skyflash').matchAll(/opacity:\s*([^;]+);/g)]
      .map((m) => m[1]!.trim())
      .filter((value) => value !== '0');

    expect(lit.length).toBeGreaterThan(0);
    for (const value of lit) {
      expect(value).toContain('var(--flash-on, 0)');
    }
  });

  it('is keyed on by exactly one direction', () => {
    const on = [...PAGE.matchAll(/--flash-on:\s*([\d.]+)/g)].map((m) => Number(m[1]));

    expect(on.filter((value) => value > 0)).toHaveLength(1);
  });

  it('is silenced for a reader who asked for less motion', () => {
    // `.skyflash` is no longer named in the reduced-motion `animation: none`
    // rule; it is spared because it lives inside `.sky`, which that media query
    // hides outright. Move the element out of `.sky` and the flash comes back
    // for exactly the readers it can hurt.
    expect(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.sky\s*\{\s*display:\s*none/.test(PAGE)).toBe(
      true,
    );

    const skyAt = PAGE.indexOf('<div class="sky"');
    expect(skyAt).toBeGreaterThan(-1);

    // Walk to the tag that closes `.sky` and check the flash is inside it.
    let depth = 0;
    let end = -1;
    for (const tag of PAGE.slice(skyAt).matchAll(/<div\b|<\/div>/g)) {
      depth += tag[0] === '</div>' ? -1 : 1;
      if (depth === 0) {
        end = skyAt + tag.index!;
        break;
      }
    }
    expect(end).toBeGreaterThan(skyAt);

    const flashAt = PAGE.indexOf('<div class="skyflash"');
    expect(flashAt).toBeGreaterThan(skyAt);
    expect(flashAt).toBeLessThan(end);
  });
});

/**
 * The rain is the last beat of the hero's sequence -- ray, bolt, then a short
 * downpour -- and that ordering is the whole reason it looks composed rather
 * than busy. It lives in the back quarter of a 6s cycle, and a cycle is the
 * first thing a later hand widens "just to see it for longer".
 */
describe('the hero rain', () => {
  /** The master clock every hero animation is cut against. */
  const CYCLE_MS = 6000;
  /** The bolt's second bloom, halfway through its own 3s cycle, twice over. */
  const BOLT_BLOOM_MS = 4500;

  function burstKeyframes(): string {
    const block = PAGE.match(/@keyframes rain-burst \{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/);
    expect(block).not.toBeNull();
    return block![1]!;
  }

  /**
   * Every percentage stop in a keyframe block, in order.
   *
   * Only the selectors, never the declarations: `translate(-50%, 0)` is a
   * percentage too, and reading those as stops puts a 50 in the middle of the
   * timeline.
   */
  function stopsIn(block: string): number[] {
    const selectors = [...block.matchAll(/([0-9%,\s]+)\{/g)].map((m) => m[1]!);
    return selectors.flatMap((sel) => [...sel.matchAll(/(\d+)%/g)].map((m) => Number(m[1])));
  }

  function burstStops(): number[] {
    return stopsIn(burstKeyframes());
  }

  it('falls in every direction, and in both skies', () => {
    const declared = [...PAGE.matchAll(/--rain-on:\s*([01]);/g)].map((m) => Number(m[1]));
    // Atmospheric night, Atmospheric day, Broadcast, Signage.
    expect(declared).toHaveLength(4);
    expect(declared.every((on) => on === 1)).toBe(true);
  });

  it('gives every direction a drop colour of its own', () => {
    // The `:root` block is ALSO Broadcast's, so a direction that leaves
    // `--rain-tint` unsaid does not get a sensible default -- it gets
    // Broadcast's yellow. Atmospheric did, once, and it took a screenshot to
    // notice. Four blocks rain, so four blocks name their own tint.
    const tints = [...PAGE.matchAll(/--rain-tint:\s*(#[0-9A-Fa-f]{6});/g)].map((m) => m[1]);
    expect(tints).toHaveLength(4);
    expect(new Set(tints).size).toBe(4);
  });

  it('runs on the same clock as the ray and the bolt', () => {
    expect(PAGE).toContain('rain-burst 6s var(--ease) infinite');
    for (const name of ['ray-draw', 'bolt-halo']) {
      expect(PAGE).toMatch(new RegExp(`animation: ${name} 6s`));
    }
  });

  it('holds off until the bolt has struck', () => {
    const [first] = burstStops();
    expect(first).toBe(0);
    // The stop where it stops being invisible.
    const liftsAt = (burstStops()[1]! / 100) * CYCLE_MS;
    expect(liftsAt).toBeGreaterThan(BOLT_BLOOM_MS);
  });

  it('is over inside two seconds, then starts again', () => {
    const stops = burstStops();
    const visibleMs = ((stops[stops.length - 1]! - stops[1]!) / 100) * CYCLE_MS;
    expect(visibleMs).toBeGreaterThanOrEqual(1000);
    expect(visibleMs).toBeLessThanOrEqual(2000);
    // It ends where it began, or the restart is a jump cut.
    expect(burstKeyframes()).toMatch(/100%\s*\{\s*opacity:\s*0;/);
  });

  it('crosses the copy instead of carving a hole around it', () => {
    // One full-bleed sheet. The band-and-two-rails arrangement this replaced
    // kept the weather off the text and drew a rectangular hole in the middle
    // of the storm doing it.
    expect(PAGE).toContain('class="sky-sheet"');
    expect(PAGE).not.toContain('sky-rail');
    expect(PAGE).toMatch(/\.sky-sheet \{[^}]*inset: 0;/);
    // The copy still sits in front of the weather; nothing is read THROUGH a
    // drop.
    expect(PAGE).toContain('.hero .wrap { position: relative; z-index: 2; }');
  });

  it('rolls a cloud in ahead of the drops, and keeps it there', () => {
    const cloud = PAGE.match(/@keyframes cloud-roll \{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/);
    expect(cloud).not.toBeNull();
    const stops = stopsIn(cloud![1]!);

    const cloudArrives = stops[2]!;
    const cloudLeaves = stops[3]!;
    const rainArrives = burstStops()[1]!;

    // Fully there before the first drop, and still there for the last.
    expect(cloudArrives).toBeLessThan(rainArrives);
    expect(cloudLeaves).toBeGreaterThanOrEqual(burstStops()[2]!);
    // One clock, still.
    expect(PAGE).toContain('animation: cloud-roll 6s var(--ease) infinite');
  });

  it('is drawn as drops rather than as streaks', () => {
    // A tiled teardrop mask over a flat tint, not a hairline gradient.
    expect(PAGE).toContain("mask-image: url(\"data:image/svg+xml,");
    expect(PAGE).toContain('background: var(--rain-tint, var(--sky-tint));');
    // Three drops in the tile, at three scales: regular spacing reads as dots.
    const tile = PAGE.match(/data:image\/svg\+xml,[^"]*/)![0];
    const scales = [...tile.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(scales).toHaveLength(3);
    expect(new Set(scales).size).toBe(3);
    // Fractions of the tile, never multiples of it. A drop scaled past 1 grows
    // with every attempt to space the field out, and a sparser field of bigger
    // drops is not a sparser field.
    expect(Math.max(...scales)).toBeLessThan(1);
  });
});
