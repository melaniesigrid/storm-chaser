import {
  AA_LARGE_TEXT,
  AA_NON_TEXT,
  AA_TEXT,
  WCAG_GENERAL_FLASH_AREA_FRACTION,
  WCAG_GENERAL_FLASH_LUMINANCE_DELTA,
  WCAG_MAX_FLASHES_PER_SECOND,
  compositeHex,
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

  /**
   * The camera screen used to hardcode its three colours and was the one screen
   * the token contract did not reach. Now that it resolves them, they need the
   * same floor every other text-on-surface pair in this system has.
   */
  it('keeps the viewfinder readout legible on the camera ground', () => {
    expect(theme.colors.cameraGround).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.onCameraGround).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(
      contrastRatio(theme.colors.onCameraGround, theme.colors.cameraGround),
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });

  /**
   * Token TOTALITY.
   *
   * This assertion did not exist before the atmosphere and motion groups were
   * added, which was worth discovering: the contract was enforced only by the
   * TypeScript interface, and every claim that "a test proves every theme
   * defines every token" was wrong. It is true now.
   *
   * The point is not that the fields are present -- the compiler covers that --
   * but that they carry REAL values. A theme that switched something off by
   * leaving a hole would pass a type check and fail here.
   */
  it('defines every atmosphere token, switched off or not', () => {
    const { atmosphere } = theme;
    const colour = /^#[0-9A-Fa-f]{6}$/;

    expect(['rain', 'sun', 'none']).toContain(atmosphere.kind);
    expect(Array.isArray(atmosphere.layers)).toBe(true);

    for (const layer of atmosphere.layers) {
      for (const value of [layer.speed, layer.angle, layer.opacity, layer.scale]) {
        expect(Number.isFinite(value)).toBe(true);
      }
      expect(layer.opacity).toBeGreaterThan(0);
      expect(layer.opacity).toBeLessThanOrEqual(1);
    }

    expect(typeof atmosphere.lightning.enabled).toBe('boolean');
    expect(Number.isFinite(atmosphere.lightning.minGapMs)).toBe(true);
    expect(Number.isFinite(atmosphere.lightning.maxGapMs)).toBe(true);
    // A real colour even when disabled, so nothing downstream has to handle a
    // missing or transparent value.
    expect(atmosphere.lightning.bloom).toMatch(colour);

    expect(Number.isFinite(atmosphere.clouds.count)).toBe(true);
    expect(Number.isFinite(atmosphere.clouds.speed)).toBe(true);
    expect(Number.isFinite(atmosphere.clouds.blur)).toBe(true);
    expect(atmosphere.clouds.tint).toMatch(colour);

    expect(typeof atmosphere.shimmer.enabled).toBe('boolean');
    expect(Number.isFinite(atmosphere.shimmer.amplitude)).toBe(true);
    expect(Number.isFinite(atmosphere.shimmer.periodMs)).toBe(true);
  });

  it('defines every motion token', () => {
    const { motion } = theme;

    expect(['atmospheric', 'mechanical']).toContain(motion.language);
    expect(motion.pressScale).toBeGreaterThan(0);
    expect(motion.pressScale).toBeLessThanOrEqual(1);
    expect(motion.pressDurationMs).toBeGreaterThan(0);
    expect(['inOut', 'linear', 'snap']).toContain(motion.pressEasing);
    expect(['rise', 'stamp']).toContain(motion.revealKind);
    expect(['wipe', 'registration']).toContain(motion.manualTransition);
    expect(motion.autoTransition).toBe('dissolve');
    expect(motion.autoTransitionMs).toBeGreaterThan(0);
  });

  /**
   * WCAG 2.3.1, Three Flashes or Below Threshold. Level A, which is a LOWER bar
   * than the AA this project clears everywhere else -- and the one an ambient
   * lightning effect is in danger of breaking.
   *
   * A bright change is a general flash when it is faster than three per second
   * AND changes relative luminance by 0.10 or more AND covers more than a
   * quarter of the viewport. Clearing any one would be enough. Every theme
   * clears all three, because the cost of being wrong is somebody's seizure.
   */
  it('keeps the lightning bloom under every WCAG 2.3.1 flash threshold', () => {
    const { safety } = theme.motion;

    expect(safety.flashMaxPerSecond).toBeLessThan(WCAG_MAX_FLASHES_PER_SECOND);
    expect(safety.flashLuminanceDelta).toBeLessThan(WCAG_GENERAL_FLASH_LUMINANCE_DELTA);
    expect(safety.flashAreaFraction).toBeLessThan(WCAG_GENERAL_FLASH_AREA_FRACTION);
  });

  /**
   * The rate ceiling and the cadence have to agree. `minGapMs` is the floor the
   * cadence tightens toward as the chase level rises, so if it were shorter
   * than the rate ceiling allows, a severe storm would flash its way past the
   * safety limit and the limit would be decoration.
   */
  it('never lets the bloom cadence outrun its own rate ceiling', () => {
    const { lightning } = theme.atmosphere;
    if (!lightning.enabled) return;

    const shortestGapMs = 1000 / theme.motion.safety.flashMaxPerSecond;

    expect(lightning.minGapMs).toBeGreaterThanOrEqual(shortestGapMs);
    expect(lightning.maxGapMs).toBeGreaterThanOrEqual(lightning.minGapMs);
  });

  it('turns off haptics and hides the layer from the screen reader by default', () => {
    expect(theme.motion.safety.hapticsDefault).toBe(false);
    expect(theme.motion.safety.ariaHidden).toBe(true);
    expect(theme.motion.safety.reducedMotionVariant).toBe('static-gradient');
  });

  /**
   * Every existing contrast assertion in this file measures text against a
   * STATIC token. The atmosphere layer puts something translucent between text
   * and its ground, so the ground the text is really on is the tint composited
   * over the gradient -- and none of those assertions would notice it going
   * wrong.
   *
   * The realistic worst case for a glyph is the densest single band crossing
   * it. Stacking all three as a full-area wash is not the worst case, it is an
   * impossible one: the bands are sparse streaks, not sheets, so any given
   * pixel is under one of them at a time.
   */
  it('keeps text readable through the densest band of its own weather', () => {
    const { layers, layerTint } = theme.atmosphere;
    if (layers.length === 0) return;

    const densest = Math.max(...layers.map((layer) => layer.opacity));

    for (const stop of theme.colors.backgroundGradient) {
      const ground = compositeHex(layerTint, stop, densest);

      expect(contrastRatio(theme.colors.text, ground)).toBeGreaterThanOrEqual(AA_LARGE_TEXT);
    }
  });

  /**
   * And the sky must not become a wash. Three bands at high opacity would sum
   * to a translucent sheet over the whole gradient, which is both ugly and the
   * thing that would break the assertion above by a different route.
   */
  it('keeps the combined weather well short of a full wash', () => {
    const { layers } = theme.atmosphere;

    const combined = layers.reduce((acc, layer) => acc + (1 - acc) * layer.opacity, 0);

    expect(combined).toBeLessThan(0.5);
  });
});

/**
 * Cross-theme claims. These are about the SYSTEM rather than any one theme, so
 * they sit outside the per-theme block.
 */
describe('the motion contract across themes', () => {
  /**
   * Field Card's argument is that a theme is not a colour scheme. If it drifted
   * like Skyward, it would only be a palette. Its stillness is written out --
   * `kind: 'none'`, no bands, nothing enabled -- rather than left as an absence
   * nobody got round to filling in.
   */
  it('makes Field Card completely still, on purpose', () => {
    const { atmosphere, motion } = getTheme('field-card');

    expect(atmosphere.kind).toBe('none');
    expect(atmosphere.layers).toHaveLength(0);
    expect(atmosphere.lightning.enabled).toBe(false);
    expect(atmosphere.clouds.count).toBe(0);
    expect(atmosphere.shimmer.enabled).toBe(false);
    expect(motion.language).toBe('mechanical');
  });

  it('gives both Skyward variants weather and an atmospheric language', () => {
    for (const name of ['skyward-day', 'skyward-night'] as const) {
      const theme = getTheme(name);

      expect(theme.atmosphere.kind).not.toBe('none');
      expect(theme.motion.language).toBe('atmospheric');
    }
  });

  /**
   * Only the night sky has lightning. Day gets a storm through the theme
   * resolver switching to night, not through the day theme growing a bloom.
   */
  it('puts lightning in the night sky and nowhere else', () => {
    const withLightning = THEME_NAMES.filter((name) => getTheme(name).atmosphere.lightning.enabled);

    expect(withLightning).toEqual(['skyward-night']);
  });

  /**
   * A mechanical theme that eased, or an atmospheric one that snapped, would
   * read as a bug rather than as a decision.
   */
  it('keeps each motion language coherent with how it presses', () => {
    for (const name of THEME_NAMES) {
      const { motion } = getTheme(name);

      if (motion.language === 'mechanical') {
        expect(motion.pressEasing).toBe('snap');
        expect(motion.revealKind).toBe('stamp');
        // It sits down on its shadow rather than shrinking.
        expect(motion.pressScale).toBe(1);
      } else {
        expect(motion.pressEasing).not.toBe('snap');
        expect(motion.revealKind).toBe('rise');
        expect(motion.pressScale).toBeLessThan(1);
      }
    }
  });

  /**
   * Safety is a floor, not a style. A theme may be calmer; none may be louder.
   */
  it('holds every theme to the same safety floor', () => {
    const safeties = THEME_NAMES.map((name) => JSON.stringify(getTheme(name).motion.safety));

    expect(new Set(safeties).size).toBe(1);
  });
});
