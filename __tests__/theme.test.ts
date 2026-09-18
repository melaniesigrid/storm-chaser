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

  it('keeps the hero readout legible at large sizes on the gradient top stop', () => {
    const [top] = theme.colors.backgroundGradient;
    expect(contrastRatio(theme.colors.text, top)).toBeGreaterThanOrEqual(AA_LARGE_TEXT);
  });
});
