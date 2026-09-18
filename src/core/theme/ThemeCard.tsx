import { LinearGradient } from 'expo-linear-gradient';
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
 *
 * It previews the whole contract, not just a colour chip: the card ground is
 * the theme's own sky gradient, the row sitting on it is a real surface raised
 * the way that theme raises surfaces, the label is set in its display face,
 * and the ladder underneath is its five tier values. Skipping the gradient was
 * what made all three options look like the same card three times.
 */
export function ThemeCard({ name, selected, onPress }: ThemeCardProps) {
  const preview = getTheme(name);
  const { colors } = preview;
  const hard = preview.elevation === 'hard';

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${preview.label}. ${preview.description}`}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: preview.radius.panel,
        overflow: 'hidden',
        borderWidth: 3,
        // Unselected still carries a 3px edge, in a faded ink rather than a
        // thinner line, so picking a theme never shifts the layout by 2px.
        borderColor: selected ? colors.text : colors.border,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <LinearGradient
        colors={colors.backgroundGradient}
        locations={colors.backgroundGradientLocations}
        style={{ padding: 14, gap: 12 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 14,
            borderRadius: preview.radius.panel - 6,
            backgroundColor: colors.surface,
            borderWidth: preview.borderWidth,
            borderColor: colors.border,
            shadowColor: hard ? colors.border : '#14213A',
            shadowOpacity: hard ? 1 : 0.16,
            shadowOffset: hard ? { width: 4, height: 4 } : { width: 0, height: 8 },
            shadowRadius: hard ? 0 : 18,
            elevation: hard ? 0 : 3,
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
              borderRadius: hard ? 6 : 14,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: selected ? colors.text : colors.textMuted,
              backgroundColor: selected ? colors.text : 'transparent',
            }}
          >
            {selected ? (
              <View
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: hard ? 2 : 6,
                  backgroundColor: colors.surface,
                }}
              />
            ) : null}
          </View>
        </View>

        {/* The tier ladder, in this theme's own values and its own edge. */}
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {(['dormant', 'unsettled', 'active', 'severe', 'extreme'] as const).map((level) => (
            <View
              key={level}
              style={{
                flex: 1,
                height: 12,
                borderRadius: hard ? 4 : 3,
                backgroundColor: colors.tier[level],
                borderWidth: hard ? 2 : 0,
                borderColor: colors.border,
              }}
            />
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}
