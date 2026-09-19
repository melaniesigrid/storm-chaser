import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, type ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAppTheme } from '@/core/theme/useAppTheme';

type TabGlyphName = 'conditions' | 'log' | 'map';

/**
 * The three tab marks.
 *
 * Drawn rather than typed. These used to be the Unicode characters ◬ ▤ ◎,
 * which render in whatever the platform's fallback face happens to be — three
 * different weights, three different optical sizes, and nothing to do with the
 * rest of the app. One stroke width and one corner radius across all three is
 * most of what makes a tab bar look deliberate.
 */
function TabGlyph({ name, color }: { name: TabGlyphName; color: ColorValue }) {
  const stroke = color as string;

  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
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
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: type.display, fontSize: 20 },
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
        },
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
