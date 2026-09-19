import type { ReactElement } from 'react';

/**
 * The web stand-in for `react-native-maps`.
 *
 * Metro aliases the native package to this module for `platform === 'web'`
 * only, so nothing in the app imports it by name and no type error points at
 * it: the only thing holding its shape to the real package's is what
 * `app/(tabs)/map.tsx` happens to import. When that drifts -- a new layer, a
 * renamed provider -- the web bundle throws while the module is still
 * evaluating and the Map tab white-screens again, which is the failure the
 * stand-in exists to prevent.
 *
 * Rendered through a call rather than a renderer: `@testing-library/react-native`
 * is not installed, and the questions worth asking here -- what surface the
 * placeholder paints, where it sits, whether map layers leak through -- are all
 * answerable from the element the component returns.
 */
const theme = {
  colors: { surfaceSunken: '#101418' },
};

jest.mock('@/core/theme/useAppTheme', () => ({
  useAppTheme: () => ({ theme }),
}));

// The `@/core/ui` barrel reaches Reanimated through Button, which will not
// initialise under Jest. Nothing here depends on how Text or the icon paint --
// only on what the stand-in hands them -- so both are stood up as plain
// components.
jest.mock('@/core/ui', () => ({
  Text: function Text() {
    return null;
  },
}));

jest.mock('@/core/icons/WeatherIcon', () => ({
  WeatherIcon: function WeatherIcon() {
    return null;
  },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const shim = require('@/core/maps/react-native-maps.web');

const MapView = shim.default as (props: Record<string, unknown>) => ReactElement;
const { MapMarker, Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } = shim;

/** The flattened style array the placeholder surface is given. */
function surfaceStyle(props: Record<string, unknown>) {
  const element = MapView(props) as ReactElement<{ style: unknown[] }>;
  return element.props.style;
}

describe('the react-native-maps web stand-in', () => {
  it('paints the sunken surface from the active theme rather than a fixed colour', () => {
    const own = (surfaceStyle({}) as Record<string, unknown>[])[0]!;

    expect(own.backgroundColor).toBe(theme.colors.surfaceSunken);
  });

  it('keeps the message in the empty half of the screen, not behind the panel stack', () => {
    const own = (surfaceStyle({}) as Record<string, unknown>[])[0]!;

    // Centred, this lands underneath the legend and the onboarding call to
    // action the Map screen floats over the bottom of the map.
    expect(own.justifyContent).toBe('flex-start');
    expect(own.alignItems).toBe('center');
    expect(own.paddingTop).toBeGreaterThan(0);
  });

  it('lets the caller style win, so the map still fills its screen', () => {
    const passed = { flex: 1 };
    const style = surfaceStyle({ style: passed });

    expect(style[style.length - 1]).toBe(passed);
  });

  it('survives being given no style at all', () => {
    expect(() => MapView({})).not.toThrow();
    expect(surfaceStyle({})).toHaveLength(2);
  });

  it('drops map layers instead of spilling their contents onto the placeholder', () => {
    const element = MapView({ children: 'a marker callout' }) as ReactElement<{
      children: unknown;
    }>;
    const rendered = JSON.stringify(element.props.children);

    expect(rendered).not.toContain('a marker callout');
  });

  it('tells the reader where the map does work', () => {
    const rendered = JSON.stringify(MapView({}));

    expect(rendered).toContain('The map runs on device');
    expect(rendered).toMatch(/iOS or Android/);
  });

  it('renders a pin as nothing rather than as an error', () => {
    expect(Marker({} as never)).toBeNull();
    expect(MapMarker).toBe(Marker);
  });

  it('carries the providers the native package exports', () => {
    expect(PROVIDER_DEFAULT).toBeUndefined();
    expect(PROVIDER_GOOGLE).toBe('google');
  });

  it('exports everything the Map screen imports from the package', () => {
    const screen = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../app/(tabs)/map.tsx'),
      'utf8',
    );
    const importLine = /import\s+(\w+)\s*,\s*\{([^}]*)\}\s*from\s*'react-native-maps'/.exec(screen);

    expect(importLine).not.toBeNull();
    expect(shim.default).toBeInstanceOf(Function);

    const named = importLine![2]!
      .split(',')
      .map((part) => part.trim())
      // `type Region` is erased at build time; only value imports have to exist.
      .filter((part) => part.length > 0 && !part.startsWith('type '));

    expect(named.length).toBeGreaterThan(0);
    for (const binding of named) {
      expect(Object.keys(shim)).toContain(binding);
    }
  });
});
