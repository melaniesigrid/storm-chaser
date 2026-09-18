import { Pressable, View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import type { WeatherIconName } from '@/core/icons/names';
import { Text } from '@/core/ui/Text';

import { getTheme, type ThemeName } from './themes';

const PREVIEW_ICON: Record<ThemeName, WeatherIconName> = {
  'skyward-day': 'clear-day',
  'skyward-night': 'starry-night',
  'field-card': 'thunderstorms-day-rain',
};

export interface ThemeCardProps {
  name: ThemeName;
  selected: boolean;
  onPress: () => void;
}

/**
 * A theme option that previews itself.
 *
 * The card is painted in the theme it offers rather than in the active one, so
 * choosing is a matter of looking rather than of reading labels. Shared by the
 * onboarding flow and Settings.
 */
export function ThemeCard({ name, selected, onPress }: ThemeCardProps) {
  const preview = getTheme(name);
  const { colors } = preview;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${preview.label}. ${preview.description}`}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: preview.radius.panel,
        overflow: 'hidden',
        borderWidth: selected ? 3 : preview.borderWidth > 0 ? preview.borderWidth : 1,
        borderColor: selected ? colors.text : colors.border,
        backgroundColor: colors.background,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          backgroundColor: colors.surface,
        }}
      >
        <WeatherIcon name={PREVIEW_ICON[name]} size={46} />

        <View style={{ flex: 1 }}>
          <Text
            variant="title"
            color={colors.text}
            style={{ fontFamily: preview.type.display, fontSize: 20, lineHeight: 26 }}
          >
            {preview.label}
          </Text>
          <Text variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            {preview.description}
          </Text>
        </View>

        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: selected ? colors.text : colors.textMuted,
            backgroundColor: selected ? colors.text : 'transparent',
          }}
        >
          {selected ? (
            <View
              style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: colors.surface }}
            />
          ) : null}
        </View>
      </View>

      {/* The tier ladder, in this theme's own values. */}
      <View style={{ flexDirection: 'row', gap: 4, padding: 12, paddingTop: 10 }}>
        {(['dormant', 'unsettled', 'active', 'severe', 'extreme'] as const).map((level) => (
          <View
            key={level}
            style={{
              flex: 1,
              height: 10,
              borderRadius: 3,
              backgroundColor: colors.tier[level],
            }}
          />
        ))}
      </View>
    </Pressable>
  );
}
