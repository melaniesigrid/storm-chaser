import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

function TabGlyph({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18, lineHeight: 22 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { colors, palette } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'InstrumentSans_600SemiBold' },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: palette.lightning,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontFamily: 'IBMPlexMono_500Medium',
          fontSize: 10,
          letterSpacing: 1,
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
