import {
  AA_LARGE_TEXT,
  AA_NON_TEXT,
  AA_TEXT,
  WCAG_GENERAL_FLASH_AREA_FRACTION,
  WCAG_GENERAL_FLASH_LUMINANCE_DELTA,
  WCAG_MAX_FLASHES_PER_SECOND,
  compositeHex,
  contrastRatio,
  meetsAA,
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
import {
  createThemeStore,
  isThemePreference,
  THEME_STORAGE_KEY,
} from '@/core/theme/themeStore';
import { bleedFor, TEXT_VARIANTS, variantStyle } from '@/core/ui/Text';
import { cardTint } from '@/features/storms/model/cardTint';
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
  /**
   * Four themes, three display faces: the two Skyward variants share Bricolage
   * because they are one design at two times of day, which is the pair the sun
   * switches between.
   */
  it('exposes exactly the four declared themes, in three display faces', () => {
    expect(THEME_NAMES).toHaveLength(4);

    const faces = new Set(THEME_NAMES.map((name) => getTheme(name).type.display));
    expect(faces.size).toBe(3);

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

  /**
   * `'auto'` is a preference, not a theme name, so it has to survive a round
   * trip through the same key without being mistaken for the unrecognised
   * value above. If it degrades to null, auto silently becomes "follow the
   * phone" on the next cold start and the user never learns it stopped.
   */
  it('round-trips the auto preference, which is not a theme name', async () => {
    const backing = createMemoryStore();
    const store = createThemeStore(backing);

    await store.save('auto');

    expect(await store.load()).toEqual({ ok: true, value: 'auto' });
    expect(isThemeName('auto')).toBe(false);
    expect(isThemePreference('auto')).toBe(true);
    expect(isThemePreference('solarized-dark')).toBe(false);
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

  // Negative tracking on a face that is already condensed is what clipped
  // letters off the ends of Broadcast headings. A theme may decline the
  // scale's tightening, but none may ask for more of it.
  it('keeps display tracking within the scale it is multiplying', () => {
    expect(theme.type.displayTracking).toBeGreaterThanOrEqual(0);
    expect(theme.type.displayTracking).toBeLessThanOrEqual(1);
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

  /**
   * The conditions hero drops its card only where there is a sky to drop it
   * onto. The two are one decision -- a hero with no card over Broadcast's flat
   * near-black is not a poster, it is a heading that lost its panel -- so they
   * are pinned to each other rather than each set by hand and trusted to agree.
   */
  it('puts the hero on the sky only where the theme generates one', () => {
    expect({ name, sky: theme.heroSurface === 'sky' }).toEqual({
      name,
      sky: theme.atmosphere.kind !== 'none',
    });
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
   * `Screen` paints the gradient behind every screen, so muted copy is drawn on
   * a stop, not on `surface`. It is body and caption text at 15px and 17px --
   * never large text -- so the bar is AA_TEXT on EVERY stop, not the large-text
   * bar on the top one.
   *
   * This is the assertion that was missing when Skyward Day's muted token sat
   * at 3.21:1 against its own top stop, with onboarding's lede drawn in it.
   */
  it('keeps muted copy readable on every stop of its own gradient', () => {
    for (const stop of theme.colors.backgroundGradient) {
      expect(contrastRatio(theme.colors.textMuted, stop)).toBeGreaterThanOrEqual(AA_TEXT);
    }
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
   * The capture screen puts its failures on the viewfinder in the severe tier
   * colour. A capture error the user cannot read is a photo they think they
   * took.
   */
  it('keeps a capture failure readable on the camera ground', () => {
    expect(
      contrastRatio(theme.colors.tier.severe, theme.colors.cameraGround),
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
    // A real colour in every theme, including the one with no layers to tint:
    // the composite check below skips a themeless sky, so without this line
    // Field Card's layerTint is never looked at by any test.
    expect(atmosphere.layerTint).toMatch(colour);

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

    expect(['atmospheric', 'mechanical', 'broadcast']).toContain(motion.language);
    expect(motion.pressScale).toBeGreaterThan(0);
    expect(motion.pressScale).toBeLessThanOrEqual(1);
    expect(motion.pressDurationMs).toBeGreaterThan(0);
    expect(['inOut', 'linear', 'snap']).toContain(motion.pressEasing);
    expect(['rise', 'stamp', 'cut']).toContain(motion.revealKind);
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
      // `textMuted` is the token `tone="muted"` and the whole caption variant
      // resolve to, at 15px and 17px. Checking only `text` here left the muted
      // token free to wash out behind the very band this test exists to police.
      expect(contrastRatio(theme.colors.textMuted, ground)).toBeGreaterThanOrEqual(AA_TEXT);
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
      } else if (motion.language === 'broadcast') {
        // A cut has no curve. It also has no stamp: nothing is being pressed
        // into paper, the next frame simply replaces this one.
        expect(motion.pressEasing).toBe('linear');
        expect(motion.revealKind).toBe('cut');
        expect(motion.pressScale).toBeLessThan(1);
      } else {
        expect(motion.pressEasing).toBe('inOut');
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

/**
 * `compositeHex` is the ground truth every atmosphere contrast assertion above
 * rests on: if it mixes wrong, those assertions pass while the real screen
 * fails. It is asserted here directly rather than only through them.
 */
describe('compositeHex', () => {
  it('returns the ground untouched at zero alpha, and the overlay at full', () => {
    expect(compositeHex('#FFFFFF', '#000000', 0)).toBe('#000000');
    expect(compositeHex('#FFFFFF', '#000000', 1)).toBe('#ffffff');
  });

  it('lands halfway between the two at half alpha', () => {
    expect(parseHex(compositeHex('#FFFFFF', '#000000', 0.5))).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
  });

  /**
   * Alpha arrives from accumulated layer opacities, which can drift outside the
   * unit range. Clamping rather than producing a channel outside 0-255 is what
   * keeps a malformed colour from reaching a native view.
   */
  it('clamps an alpha outside the unit range instead of overshooting', () => {
    expect(compositeHex('#FFFFFF', '#000000', 4)).toBe(compositeHex('#FFFFFF', '#000000', 1));
    expect(compositeHex('#FFFFFF', '#000000', -2)).toBe(compositeHex('#FFFFFF', '#000000', 0));
  });

  /**
   * A non-finite alpha is the clamp's blind spot: NaN passes straight through
   * Math.min/Math.max, and the result is '#NaNNaNNaN' rather than a colour.
   * Alpha arrives from accumulated layer opacities, so a division by zero
   * upstream is all it takes.
   */
  it('returns a real colour for a non-finite alpha', () => {
    expect(compositeHex('#FFFFFF', '#000000', Number.NaN)).toMatch(/^#[0-9a-f]{6}$/);
    expect(compositeHex('#FFFFFF', '#000000', Number.NaN)).toBe(
      compositeHex('#FFFFFF', '#000000', 0),
    );
    expect(compositeHex('#FFFFFF', '#000000', Number.POSITIVE_INFINITY)).toBe(
      compositeHex('#FFFFFF', '#000000', 1),
    );
  });

  /**
   * A channel below 16 is one hex digit unless it is padded, and an unpadded
   * channel silently shortens the string into an invalid colour.
   */
  it('pads a single-digit channel, so the result is always seven characters', () => {
    const composited = compositeHex('#0A0B0C', '#000000', 1);

    expect(composited).toHaveLength(7);
    expect(composited).toBe('#0a0b0c');
  });

  it('returns something the rest of this module can read back', () => {
    const composited = compositeHex('#9FD4FF', '#0B1026', 0.28);

    expect(() => parseHex(composited)).not.toThrow();
    expect(relativeLuminance(composited)).toBeGreaterThan(relativeLuminance('#0B1026'));
  });

  it('takes the short hex form on either side', () => {
    expect(compositeHex('#FFF', '#000', 1)).toBe('#ffffff');
    expect(compositeHex('#FFF', '#000', 0)).toBe('#000000');
  });

  it('rejects a colour it cannot parse rather than mixing nonsense', () => {
    expect(() => compositeHex('rebeccapurple', '#000000', 0.5)).toThrow(/Not a hex colour/);
    expect(() => compositeHex('#000000', '#12345', 0.5)).toThrow(/Not a hex colour/);
  });
});

describe('the AA helper and the WCAG thresholds', () => {
  it('reads meetsAA off the same ratio the assertions use', () => {
    expect(meetsAA('#000000', '#FFFFFF')).toBe(true);
    expect(meetsAA('#777777', '#808080')).toBe(false);
    // Large text clears at a lower bar than body text, on the same pair.
    expect(meetsAA('#767676', '#FFFFFF', AA_LARGE_TEXT)).toBe(true);
  });

  /**
   * These are quoted from WCAG 2.3.1, not chosen. A theme is allowed to move;
   * the line it is held to is not, so it is pinned separately from any theme.
   */
  it('pins the flash thresholds to the values the spec states', () => {
    expect(WCAG_MAX_FLASHES_PER_SECOND).toBe(3);
    expect(WCAG_GENERAL_FLASH_LUMINANCE_DELTA).toBeCloseTo(0.1, 5);
    expect(WCAG_GENERAL_FLASH_AREA_FRACTION).toBeCloseTo(0.25, 5);
  });
});

describe('the type scale', () => {
  /**
   * A line box shorter than its own font size crops the glyphs inside it. The
   * `score` variant shipped at 56px inside a 54px line and lost every
   * descender, so this walks the whole scale rather than pinning the one case.
   */
  it('never sets a line height below its font size', () => {
    for (const themeName of THEME_NAMES) {
      const theme = THEMES[themeName];

      for (const variant of TEXT_VARIANTS) {
        const style = variantStyle(variant, theme);
        const fontSize = style.fontSize as number;
        const lineHeight = style.lineHeight as number;

        expect(typeof fontSize).toBe('number');
        expect(typeof lineHeight).toBe('number');
        // Named in the failure so a regression says which variant broke.
        expect({ variant, ok: lineHeight >= fontSize }).toEqual({ variant, ok: true });
      }
    }
  });

  /**
   * The display faces paint outside the box React Native measures for them, so
   * the large variants carry a bleed. It has to cancel itself out, or every
   * heading in the app shifts and the right-aligned readouts stop lining up.
   */
  it('cancels the display bleed so layout never moves', () => {
    for (const variant of TEXT_VARIANTS) {
      const style = variantStyle(variant, THEMES['skyward-day']);
      const bleed = bleedFor(variant, style.fontSize as number);
      if (!bleed) continue;

      if (bleed.paddingHorizontal !== undefined) {
        expect(bleed.marginHorizontal).toBe(-(bleed.paddingHorizontal as number));
      }
      if (bleed.paddingRight !== undefined) {
        expect(bleed.marginRight).toBe(-(bleed.paddingRight as number));
      }
    }
  });

  it('gives the display variants room and leaves body copy alone', () => {
    expect(bleedFor('display', 40)).toMatchObject({ paddingHorizontal: 4 });
    expect(bleedFor('body', 17)).toBeNull();
    expect(bleedFor('caption', 15)).toBeNull();
  });

  /**
   * Negative tracking shortens the advance of the last glyph as well as the
   * ones before it, so the measured box ends inside the final letter's ink.
   * The allowance has to cover the tightening, not just the side bearing --
   * this is the assertion that was missing while the 64px reading was losing
   * the end of its degree sign.
   */
  it('widens the allowance by the tracking the variant is set with', () => {
    const loose = bleedFor('hero', 64, 0) as { paddingHorizontal: number };
    const tight = bleedFor('hero', 64, -2) as { paddingHorizontal: number };

    expect(tight.paddingHorizontal).toBeGreaterThanOrEqual(loose.paddingHorizontal + 2);
  });

  /**
   * And every variant the live scale tightens has to be asking for that room,
   * rather than the widening being a function nothing calls with a real value.
   */
  it('passes the live tracking through for every tightened variant', () => {
    for (const variant of TEXT_VARIANTS) {
      const style = variantStyle(variant, THEMES['skyward-day']);
      const tracking = (style.letterSpacing as number | undefined) ?? 0;
      if (tracking >= 0) continue;

      const bleed = bleedFor(variant, style.fontSize as number, tracking) as {
        paddingHorizontal: number;
      };
      const untracked = bleedFor(variant, style.fontSize as number) as {
        paddingHorizontal: number;
      };

      expect({ variant, ok: bleed.paddingHorizontal > untracked.paddingHorizontal }).toEqual({
        variant,
        ok: true,
      });
    }
  });
});

describe('card stocks', () => {
  /**
   * Field Card prints each report on a different stock. A tint that cannot
   * carry the theme's ink is a readability bug dressed as a style, so the whole
   * palette is held to AA for body text.
   */
  it('carries body text at AA on every tint a theme offers', () => {
    for (const themeName of THEME_NAMES) {
      const theme = THEMES[themeName];
      for (const tint of theme.colors.cardTints ?? []) {
        expect({ themeName, tint, ok: meetsAA(theme.colors.text, tint, AA_TEXT) })
          .toEqual({ themeName, tint, ok: true });
      }
    }
  });

  /*
   * There is deliberately no assertion that the severity rail clears 3:1
   * against the stock behind it. The teal `unsettled` fill cannot do that on
   * white, and the project already rejected the same assertion once against
   * `surface`: the tier is carried by a text label on the card as well as by
   * the rail, so the colour is a second encoding rather than the only one.
   * Bending the palette to satisfy a check that is not required would lose the
   * tier hues the whole theme is built on.
   */

  it('gives a report the same stock every time, and no stock without a palette', () => {
    const tints = THEMES['field-card'].colors.cardTints;

    expect(cardTint('storm_abc', tints)).toBe(cardTint('storm_abc', tints));
    expect(cardTint('storm_abc', undefined)).toBeUndefined();
    expect(cardTint('storm_abc', [])).toBeUndefined();
  });

  it('spreads ids across the whole palette rather than favouring one', () => {
    const tints = THEMES['field-card'].colors.cardTints ?? [];
    const seen = new Set<string | undefined>();

    for (let index = 0; index < 400; index += 1) {
      seen.add(cardTint(`storm_${index}_${index * 7}`, tints));
    }

    expect(seen.size).toBe(tints.length);
  });
});
