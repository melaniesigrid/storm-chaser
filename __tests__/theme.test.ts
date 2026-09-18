import {
  AA_LARGE_TEXT,
  AA_NON_TEXT,
  AA_TEXT,
  contrastRatio,
  parseHex,
  relativeLuminance,
} from '@/core/theme/contrast';
import {
  DEFAULT_THEME,
  THEMES,
  THEME_NAMES,
  getTheme,
  isThemeName,
  themeForColorScheme,
} from '@/core/theme/themes';
import { createThemeStore, THEME_STORAGE_KEY } from '@/core/theme/themeStore';
import { createMemoryStore, type KeyValueStore } from '@/core/storage/KeyValueStore';
import type { ChaseLevel } from '@/features/weather/model/types';

const LEVELS: ChaseLevel[] = ['dormant', 'unsettled', 'active', 'severe', 'extreme'];

/** A store whose every operation rejects, to exercise the failure branches. */
function createBrokenStore(): KeyValueStore {
  const boom = async () => {
    throw new Error('disk on fire');
  };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

describe('contrast', () => {
  it('parses both hex forms', () => {
    expect(parseHex('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('14140F')).toEqual({ r: 20, g: 20, b: 15 });
  });

  it('rejects anything that is not a hex colour', () => {
    expect(() => parseHex('rebeccapurple')).toThrow(/Not a hex colour/);
    expect(() => parseHex('#12345')).toThrow(/Not a hex colour/);
  });

  it('anchors luminance at the extremes', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('puts black on white at the maximum 21:1, in either order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  /**
   * Regression guards. These are the exact pairs that shipped broken before the
   * theme system existed: the light-mode offline banner and the dark muted
   * token. If a future palette reintroduces either, this fails.
   */
  it('still recognises the two bugs that motivated this module', () => {
    expect(contrastRatio('#080B10', '#1A212C')).toBeLessThan(1.5);
    expect(contrastRatio('#3A4553', '#080B10')).toBeLessThan(2.5);
  });
});

describe('theme registry', () => {
  it('exposes exactly the three declared themes', () => {
    expect(THEME_NAMES).toHaveLength(3);
    expect(Object.keys(THEMES).sort()).toEqual([...THEME_NAMES].sort());
  });

  it('names each theme consistently with its key', () => {
    for (const name of THEME_NAMES) {
      expect(getTheme(name).name).toBe(name);
    }
  });

  it('guards the stored-preference boundary', () => {
    expect(isThemeName('field-card')).toBe(true);
    expect(isThemeName('solarized')).toBe(false);
    expect(isThemeName(null)).toBe(false);
    expect(isThemeName(undefined)).toBe(false);
  });

  it('falls back to a real theme name', () => {
    expect(THEME_NAMES).toContain(DEFAULT_THEME);
  });

  it('maps system appearance onto the two Skyward variants', () => {
    expect(themeForColorScheme('dark')).toBe('skyward-night');
    expect(themeForColorScheme('light')).toBe('skyward-day');
    expect(themeForColorScheme(null)).toBe('skyward-day');
    expect(themeForColorScheme(undefined)).toBe('skyward-day');
  });

  /**
   * The reason the parameter is a loose string rather than `ColorSchemeName`.
   * Android reports `'unspecified'` for a device that has never been given an
   * appearance, and this is the value that would have slipped through a
   * `scheme === 'light' ? day : night` reading of the same rule and opened a
   * daytime phone on the night theme.
   */
  it('treats anything that is not an explicit dark as day', () => {
    expect(themeForColorScheme('unspecified')).toBe('skyward-day');
    expect(themeForColorScheme('')).toBe('skyward-day');
    expect(themeForColorScheme('DARK')).toBe('skyward-day');
  });

  it('only ever names a theme that exists', () => {
    for (const scheme of ['dark', 'light', 'unspecified', null, undefined]) {
      expect(THEME_NAMES).toContain(themeForColorScheme(scheme));
    }
  });
});

describe('theme store', () => {
  it('reports no choice when nothing has been saved', async () => {
    const result = await createThemeStore(createMemoryStore()).load();
    expect(result).toEqual({ ok: true, value: null });
  });

  it('round trips a saved choice', async () => {
    const store = createThemeStore(createMemoryStore());

    await store.save('field-card');

    expect(await store.load()).toEqual({ ok: true, value: 'field-card' });
  });

  it('writes under the versioned key', async () => {
    const backing = createMemoryStore();

    await createThemeStore(backing).save('skyward-night');

    expect(await backing.getItem(THEME_STORAGE_KEY)).toBe('skyward-night');
  });

  /**
   * The value on disk is the one thing here that a future version of the app
   * does not control. A renamed theme must degrade to "no choice", not crash.
   */
  it('treats an unrecognised stored value as no choice', async () => {
    const backing = createMemoryStore({ [THEME_STORAGE_KEY]: 'solarized-dark' });

    expect(await createThemeStore(backing).load()).toEqual({ ok: true, value: null });
  });

  it('clearing returns to following system appearance', async () => {
    const store = createThemeStore(createMemoryStore());
    await store.save('field-card');

    await store.clear();

    expect(await store.load()).toEqual({ ok: true, value: null });
  });

  it('surfaces storage failures as typed errors rather than throwing', async () => {
    const store = createThemeStore(createBrokenStore());

    const loaded = await store.load();
    const saved = await store.save('skyward-day');
    const cleared = await store.clear();

    for (const result of [loaded, saved, cleared]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe('storage');
    }
  });
});

describe.each(THEME_NAMES)('%s', (name) => {
  const theme = getTheme(name);

  it('defines a colour for every tier, as fill and as text', () => {
    for (const level of LEVELS) {
      expect(theme.colors.tier[level]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.colors.tierText[level]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('gives every tier its own fill, so severe and extreme never collapse', () => {
    const fills = LEVELS.map((level) => theme.colors.tier[level].toUpperCase());
    expect(new Set(fills).size).toBe(LEVELS.length);
  });

  it('names a display face and keeps readouts monospaced', () => {
    expect(theme.type.display.length).toBeGreaterThan(0);
    expect(theme.type.mono).toMatch(/Mono/);
    expect(theme.type.monoBold).toMatch(/Mono/);
  });

  it('clears AA for body text on both background and surface', () => {
    expect(contrastRatio(theme.colors.text, theme.colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(theme.colors.text, theme.colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('clears AA for muted text, which is where the old palette failed', () => {
    expect(contrastRatio(theme.colors.textMuted, theme.colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(theme.colors.textMuted, theme.colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('clears AA for both tab states against the tab bar', () => {
    expect(contrastRatio(theme.colors.tabActive, theme.colors.tabBar)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(theme.colors.tabInactive, theme.colors.tabBar)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('keeps the primary action legible', () => {
    expect(contrastRatio(theme.colors.onAccent, theme.colors.accent)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('clears AA for every tier used as text on surface', () => {
    for (const level of LEVELS) {
      const ratio = contrastRatio(theme.colors.tierText[level], theme.colors.surface);
      expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  /**
   * Tier FILLS are deliberately not held to a contrast floor against the
   * surface. A yellow `active` fill on a white card cannot reach 3:1 and does
   * not need to: the chase meter always ships alongside the numeric score and
   * the text headline, so tier is encoded three ways and colour is never the
   * sole carrier of meaning (WCAG 1.4.1). What must hold is that the text form
   * of the tier is readable, which the assertion above covers.
   */
  it('always offers a readable text form beside the fill, so colour is never alone', () => {
    for (const level of LEVELS) {
      expect(theme.colors.tierText[level]).toBeDefined();
      expect(contrastRatio(theme.colors.tierText[level], theme.colors.surface)).toBeGreaterThanOrEqual(
        AA_NON_TEXT,
      );
    }
  });

  it('separates surface from background enough to read as a raised plane', () => {
    expect(contrastRatio(theme.colors.surface, theme.colors.background)).toBeGreaterThan(1);
  });

  it('runs the sky gradient through four ascending stops', () => {
    const { backgroundGradient: stops, backgroundGradientLocations: at } = theme.colors;

    // Destructured rather than indexed: both are fixed-length tuples, and
    // indexing them reads as `number | undefined` under the strict index rules
    // this project compiles with.
    const [first, second, third, last] = at;

    expect(stops).toHaveLength(4);
    expect(at).toHaveLength(4);
    expect(first).toBe(0);
    expect(last).toBe(1);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
    expect(last).toBeGreaterThan(third);

    for (const stop of stops) {
      expect(stop).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('gives the brand layer a full shell and a full ray', () => {
    expect(theme.brand.voltShell).toHaveLength(3);
    expect(theme.brand.ray).toHaveLength(3);
    for (const value of [...theme.brand.voltShell, ...theme.brand.ray]) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  /**
   * Volt's idle shell is deliberately NOT the accent. It used to be, which
   * meant he was rust on Skyward Day and amber on Skyward Night: a different
   * character per theme, and on Field Card indistinguishable from the primary
   * button. What has to hold is that idle never collides with a mood, or
   * changing mood would show nothing at all.
   */
  it('keeps the idle shell clear of every mood fill', () => {
    const idle = theme.brand.voltShell[1].toUpperCase();

    for (const level of ['dormant', 'unsettled', 'severe'] as const) {
      expect(theme.colors.tier[level].toUpperCase()).not.toBe(idle);
    }
  });

  /**
   * The monogram is a large graphic, so it is held to the 3:1 non-text floor
   * rather than the 4.5:1 body floor. Below that the bolt disappears into its
   * own plate at app-icon size.
   */
  it('keeps the monogram mark readable on its plate', () => {
    expect(
      contrastRatio(theme.brand.monogramMark, theme.brand.monogramPlate),
    ).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('keeps the hero readout legible at large sizes on the gradient top stop', () => {
    const [top] = theme.colors.backgroundGradient;
    expect(contrastRatio(theme.colors.text, top)).toBeGreaterThanOrEqual(AA_LARGE_TEXT);
  });
  /**
   * The rest of the brand contract. `voltShell` and `ray` are checked above;
   * these are the four tokens Volt and the Monogram read that nothing else
   * validates. A missing one renders as an `undefined` colour, which React
   * Native draws as transparent rather than throwing, so the mascot simply
   * loses a feature and no test notices.
   */
  it('declares every remaining brand token as a colour a native view accepts', () => {
    const colour = /^(#[0-9A-Fa-f]{6}|rgba?\([0-9.,\s]+\))$/;

    expect(theme.brand.voltShade).toMatch(colour);
    expect(theme.brand.voltEye).toMatch(colour);
    expect(theme.brand.voltGlow).toMatch(colour);
    expect(theme.brand.monogramPlate).toMatch(colour);
    expect(theme.brand.monogramMark).toMatch(colour);
  });

  /**
   * The radius is a FRACTION of the plate size, so one number works at 24px
   * and at 512px. Anything above 0.5 is more than half the side and stops
   * being a rounded square; anything negative is not a radius at all.
   */
  it('keeps the monogram radius a usable fraction of the plate', () => {
    expect(theme.brand.monogramRadius).toBeGreaterThanOrEqual(0);
    expect(theme.brand.monogramRadius).toBeLessThanOrEqual(0.5);
  });

  /**
   * The shell is documented light to deep, and Field Card runs all three as a
   * gradient. Three equal stops would render that gradient flat, and a stop
   * out of order would light the shell from the wrong side.
   */
  it('orders the shell from light to deep with three distinct stops', () => {
    const [light, mid, deep] = theme.brand.voltShell;

    expect(new Set([light, mid, deep]).size).toBe(3);
    expect(relativeLuminance(light)).toBeGreaterThan(relativeLuminance(mid));
    expect(relativeLuminance(mid)).toBeGreaterThan(relativeLuminance(deep));
  });

  it('runs the ray through three distinct stops, never a two-colour fade', () => {
    expect(new Set(theme.brand.ray).size).toBe(3);
  });

  /**
   * Pupils have to be visible against whatever they are drawn on. Skyward
   * draws them straight onto the shell, so there they must not be the shell.
   */
  it('never paints the pupils the same colour as the shell they sit on', () => {
    expect(theme.brand.voltEye.toUpperCase()).not.toBe(theme.brand.voltShell[1].toUpperCase());
  });
  /**
   * Volt's mood shells, as a token contract.
   *
   * `Volt` swaps his shell for a tier fill when his mood changes — `alert`
   * takes `tier.severe`, `logged` takes `tier.unsettled`, `offline` and
   * `asleep` take `tier.dormant` — and on the Skyward themes his pupils are
   * drawn straight onto that shell with no visor behind them. The component
   * itself needs a renderer this project does not configure, but the pairing it
   * depends on is pure data and is exactly where a palette change breaks him:
   * a dormant fill that drifts light enough to swallow the pupils leaves a
   * blank offline mascot, and no existing assertion notices.
   *
   * Held to the 3:1 non-text floor, because a pupil is a shape rather than
   * text. `#14140F` and `#C2C9D4` are the two literals `shellColors` uses for
   * the bare-shell pupils, restated here as the contract they are.
   */
  it('keeps the pupils visible on every mood shell', () => {
    const inkPupil = '#14140F';
    const palePupil = '#C2C9D4';

    // alert and logged
    expect(contrastRatio(inkPupil, theme.colors.tier.severe)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrastRatio(inkPupil, theme.colors.tier.unsettled)).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
    // offline and asleep, which share the dormant fill
    expect(contrastRatio(palePupil, theme.colors.tier.dormant)).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    );
  });

  /**
   * The idle shell is the one Volt wears most of the time, and its pupils
   * follow the theme rather than a literal: dark ink on a light shell, and the
   * theme's own `voltEye` on a dark one. Both have to clear the same floor.
   */
  it('keeps the pupils visible on the idle shell in either polarity', () => {
    const pupil = theme.isDark ? theme.brand.voltEye : '#14140F';

    expect(contrastRatio(pupil, theme.brand.voltShell[1])).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
