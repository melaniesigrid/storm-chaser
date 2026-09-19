import { Text as RNText, StyleSheet, type TextStyle } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { Wordmark } from '@/core/brand/Wordmark';
import { THEMES, THEME_NAMES, type ThemeName } from '@/core/theme/themes';
import { Text, inkFor } from '@/core/ui/Text';

jest.mock('@/core/theme/useAppTheme', () => ({
  useAppTheme: () => ({ theme: (global as { __theme?: unknown }).__theme }),
}));

/**
 * Reanimated is mocked here rather than in `jest.setup.js`.
 *
 * The suite is otherwise pure domain logic and deliberately keeps native
 * bindings out of the run; this is the one file that renders a component, and
 * the wordmark pulls Reanimated in for the ray it draws. Mocking it locally
 * keeps that cost in the file that incurs it. Only the surface the wordmark
 * touches is stubbed, and the ray is not what these tests are about -- the
 * two <Text> nodes above it are.
 */
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0, linear: () => 0 },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useReducedMotion: () => true,
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: (to: unknown) => to,
    withRepeat: (value: unknown) => value,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: View };
});

function withTheme<T>(name: ThemeName, run: () => T): T {
  (global as { __theme?: unknown }).__theme = THEMES[name];
  return run();
}

/** Every resolved text style in a tree, flattened the way the platform sees it. */
function textStyles(element: React.ReactElement): TextStyle[] {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });

  return tree.root
    .findAllByType(RNText)
    .map((node) => StyleSheet.flatten(node.props.style as TextStyle));
}

/**
 * The floor has to survive the caller.
 *
 * The first fix put the ink floor inside `variantStyle`, which made it a
 * suggestion: `Text` applies the caller's `style` after the variant, so any
 * inline `lineHeight` put the line box straight back under the face. Twelve
 * call sites pass one. The wordmark's was `size * 0.94` -- a 21px box for
 * Anton at 22px, where Anton needs 34 -- and "Storm Chaser" on the profile
 * screen in Broadcast lost the tops and tails of both words.
 *
 * These render the real component rather than calling `variantStyle`, because
 * the bug lived entirely in the gap between the two.
 */
describe('rendered text', () => {
  it.each(THEME_NAMES)('%s: an inline lineHeight cannot undercut the face', (name) => {
    const tight = withTheme(name, () =>
      textStyles(
        <Text variant="display" style={{ fontSize: 22, lineHeight: 21 }}>
          STORM
        </Text>,
      ),
    );

    for (const style of tight) {
      const floor = (style.fontSize as number) * inkFor(style.fontFamily as string);
      expect(style.lineHeight as number).toBeGreaterThanOrEqual(floor);
    }
  });

  it('still lets a caller ask for MORE leading than the face needs', () => {
    const [style] = withTheme('skyward-day', () =>
      textStyles(<Text variant="body" style={{ lineHeight: 40 }}>spacious</Text>),
    );

    expect(style?.lineHeight).toBe(40);
  });

  /**
   * The bug as reported: the wordmark, at the size the profile screen sets it,
   * in the theme it was visibly cropping in.
   */
  it.each(THEME_NAMES)('%s: the profile wordmark draws both words whole', (name) => {
    const styles = withTheme(name, () =>
      textStyles(<Wordmark size={22} align="center" animated={false} />),
    );

    expect(styles).toHaveLength(2);

    for (const style of styles) {
      const floor = (style.fontSize as number) * inkFor(style.fontFamily as string);
      expect(style.lineHeight as number).toBeGreaterThanOrEqual(floor);
    }
  });

  /**
   * And the lockup still looks like the lockup. The extra leading is handed
   * back to layout as a negative margin, so the two words occupy the tight
   * stack they were designed on rather than drifting apart.
   */
  it.each(THEME_NAMES)('%s: the wordmark keeps its tight stack', (name) => {
    const size = 22;
    const stack = Math.round(size * 0.94);
    const styles = withTheme(name, () =>
      textStyles(<Wordmark size={size} align="center" animated={false} />),
    );

    for (const style of styles) {
      const occupied = (style.lineHeight as number) + 2 * (style.marginVertical as number);
      // Within a pixel: the compensation is rounded to whole pixels per edge.
      expect(Math.abs(occupied - stack)).toBeLessThanOrEqual(1);
    }
  });
});
