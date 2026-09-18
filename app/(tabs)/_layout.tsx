import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 20, lineHeight: 24 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { theme } = useAppTheme();
  const { colors, type } = theme;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: type.display, fontSize: 20 },
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
          tabBarIcon: ({ color }) => <TabGlyph glyph="◬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Field log',
          tabBarIcon: ({ color }) => <TabGlyph glyph="▤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabGlyph glyph="◎" color={color} />,
        }}
      />
    </Tabs>
  );
}
