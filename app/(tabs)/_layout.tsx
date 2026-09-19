import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, View, type ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Monogram } from '@/core/brand';
import { useAppTheme } from '@/core/theme/useAppTheme';

type TabGlyphName = 'conditions' | 'log' | 'map';

/**
 * The three tab marks.
 *
 * Drawn rather than typed. These used to be the Unicode characters ◬ ▤ ◎,
 * which render in whatever the platform's fallback face happens to be: three
 * different weights, three different optical sizes, and nothing to do with the
 * rest of the app. One stroke width and one corner radius across all three is
 * most of what makes a tab bar look deliberate.
 */
function TabGlyph({ name, color }: { name: TabGlyphName; color: ColorValue }) {
  const stroke = color as string;

  // 30, not 24. The glyphs are drawn on a 24 grid and scale with the viewBox,
  // so the stroke thickens with them and the bar reads as a set of marks
  // rather than as three hairline diagrams under the labels.
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      {name === 'conditions' ? (
        <>
          <Path
            d="M7.6 17.4a4.3 4.3 0 0 1-.3-8.58 6 6 0 0 1 11.1 1.06 3.8 3.8 0 0 1-.6 7.52"
            stroke={stroke}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M12.9 12.1 10 16.4h2.4l-1 3.5 3.6-4.8h-2.5z" fill={stroke} />
        </>
      ) : null}

      {name === 'log' ? (
        <>
          <Rect
            x={4}
            y={4}
            width={16}
            height={16}
            rx={3.5}
            stroke={stroke}
            strokeWidth={1.9}
          />
          <Path
            d="M8.2 9.4h7.6M8.2 12.8h7.6M8.2 16.2h4.6"
            stroke={stroke}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
        </>
      ) : null}

      {name === 'map' ? (
        <>
          <Path
            d="M12 20.6s6.3-5.9 6.3-10.2a6.3 6.3 0 1 0-12.6 0c0 4.3 6.3 10.2 6.3 10.2z"
            stroke={stroke}
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={10.2} r={2.4} stroke={stroke} strokeWidth={1.9} />
        </>
      ) : null}
    </Svg>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { colors, type } = theme;

  return (
    <Tabs
      screenOptions={{
        /*
          The header is the top of the sky, not a bar laid over it. Taking the
          gradient's first stop rather than `background` is what closes the
          seam: a flat cream strip above a blue zenith reads as two screens
          stacked, and on the themes with no gradient the two values are the
          same, so nothing moves there.
        */
        headerStyle: { backgroundColor: colors.backgroundGradient[0] },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: type.display, fontSize: 20 },
        /*
          The mark, small, at the head of every tab. It strikes once as the
          header mounts -- which is once per tab change, not on a loop -- so
          the identity from the launch overlay carries into the app rather
          than being something you only ever see for a second at the door.

          Decorative, and hidden from the screen reader: the header title
          beside it already says which tab this is, and a mark announcing
          "Storm Chaser" on every tab change is noise in a linear read.
        */
        headerLeft: () => (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ paddingHorizontal: 16, justifyContent: 'center' }}
          >
            <Monogram size={32} motion="strike" />
          </View>
        ),
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your profile and appearance"
            onPress={() => router.push('/profile')}
            hitSlop={12}
            style={{ paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}
          >
            <Text
              style={{
                color: colors.text,
                fontFamily: type.monoMedium,
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              Profile
            </Text>
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          // The bar grows with the marks: at the default height a 30px glyph
          // and a 12px label crowd each other against the top rule.
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarIconStyle: { marginBottom: 2 },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontFamily: type.monoMedium,
          // Was 10px with 1px tracking, which is below the smallest size iOS
          // recommends and sat on an inactive colour measuring 2.0:1.
          fontSize: 12,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Conditions',
          tabBarIcon: ({ color }) => <TabGlyph name="conditions" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Field log',
          tabBarIcon: ({ color }) => <TabGlyph name="log" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabGlyph name="map" color={color} />,
        }}
      />
    </Tabs>
  );
}
