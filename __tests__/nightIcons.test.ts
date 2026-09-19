import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { WEATHER_ICON_NAMES } from '@/core/icons/names';

/**
 * The night icons must not contain a moon.
 *
 * Every Meteocons night glyph draws the same waning crescent, so before this
 * the app asserted a moon that was wrong on about twenty-six nights in every
 * twenty-nine -- including every full moon, which is the one anybody looks up
 * to check. `scripts/build-night-icons.mjs` cuts the crescent out and
 * `NightIcon` draws the real phase behind the remainder.
 *
 * These assertions are on the FILES rather than on a rendered component,
 * because the suite has no renderer. That turns out to be the right level
 * anyway: the failure being guarded against is someone regenerating the icons
 * from a Meteocons version whose moon group is named something else, and the
 * generator failing open. A rendering test would not see that; reading the
 * bytes does.
 */

const GENERATED = resolve(__dirname, '../src/core/icons/night');
const METEOCONS = resolve(__dirname, '../node_modules/@meteocons/svg-static/flat');

/** The six Meteocons glyphs that ship a moon. */
const NIGHT_ICONS = [
  'clear-night',
  'starry-night',
  'partly-cloudy-night',
  'overcast-night',
  'fog-night',
  'thunderstorms-night-rain',
];

describe('the generated night icons', () => {
  it('exist for every night icon the app can name', () => {
    const generated = readdirSync(GENERATED)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.replace(/\.svg$/, ''));

    for (const name of NIGHT_ICONS) {
      expect(generated).toContain(name);
    }
  });

  it.each(NIGHT_ICONS)('has no moon left in %s', (name) => {
    const svg = readFileSync(resolve(GENERATED, `${name}.svg`), 'utf8');
    expect(svg).not.toMatch(/id="Moon/);
  });

  it.each(NIGHT_ICONS)('is still the rest of the %s artwork', (name) => {
    // The other direction, and the one that actually bites: a cut that took
    // too much leaves a file that parses, renders, and shows nothing. Only
    // clear-night is legitimately almost all moon, so it is exempt from the
    // size floor rather than the rule being loosened for everybody.
    const original = readFileSync(resolve(METEOCONS, `${name}.svg`), 'utf8');
    const stripped = readFileSync(resolve(GENERATED, `${name}.svg`), 'utf8');

    expect(stripped.length).toBeLessThan(original.length);
    if (name !== 'clear-night') {
      expect(stripped.length).toBeGreaterThan(original.length * 0.5);
    }
    expect(stripped).toContain('<svg');
    expect(stripped).toContain('</svg>');
  });

  it('still had a moon to remove in the upstream artwork', () => {
    // If Meteocons ever ships these without a moon, the generator quietly
    // becomes a no-op and this whole feature is dead code. Better to hear it
    // here than to wonder why the phase stopped changing.
    for (const name of NIGHT_ICONS) {
      expect(readFileSync(resolve(METEOCONS, `${name}.svg`), 'utf8')).toMatch(/id="Moon/);
    }
  });

  it('covers every -night name the icon set declares', () => {
    // The gap this closes: adding a seventh night icon to names.ts without
    // stripping its moon would ship a fixed crescent again, and nothing else
    // in the suite would notice.
    const declaredNight = WEATHER_ICON_NAMES.filter(
      (name) => name.endsWith('-night') || name === 'thunderstorms-night-rain',
    );

    for (const name of declaredNight) {
      expect(NIGHT_ICONS).toContain(name);
    }
  });
});
