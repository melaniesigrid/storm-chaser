import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import type { WeatherIconName } from '@/core/icons/names';
import { Text } from '@/core/ui/Text';

import { getTheme, type ThemeName } from './themes';

/**
 * What each card pretends the weather is.
 *
 * Fixed sample readings rather than the live snapshot: a chooser has to be
 * comparable, and four cards showing four different temperatures because the
 * hour changed underneath them would be comparing the weather, not the themes.
 * Night reads colder for the same reason it reads darker.
 */
const PREVIEW: Record<ThemeName, { icon: WeatherIconName; temperature: string }> = {
  'skyward-day': { icon: 'clear-day', temperature: '24°' },
  'skyward-night': { icon: 'starry-night', temperature: '18°' },
  // The warning glyph, not a sky: Broadcast previews an alert, not weather.
  broadcast: { icon: 'code-yellow', temperature: '24°' },
  'field-card': { icon: 'thunderstorms-day-rain', temperature: '24°' },
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
 * It is a miniature of the Conditions screen, and deliberately the same
 * miniature the marketing page runs: sky, a headline reading set in the
 * theme's display face, and then one raised panel that carries the chase index
 * AND the tier ladder together. The ladder used to sit bare on the gradient
 * beside the panel, which left the card looking like two unrelated halves --
 * on a real screen nothing floats on the sky, everything data-bearing lands on
 * a surface. Anything the theme would put on a panel is on the panel here.
 *
 * Every string on the card sets its font from `preview.type` rather than from
 * `Text`'s variants, because the variants resolve against the ACTIVE theme:
 * without the override, all four cards would be lettered in whichever theme
 * the user is currently wearing.
 */
export function ThemeCard({ name, selected, onPress }: ThemeCardProps) {
  const preview = getTheme(name);
  const { colors, type } = preview;
  const hard = preview.elevation === 'hard';
  // Field Card and Broadcast are signage faces: they set their condition line
  // in the display face, uppercase, the way a card or a lower third would.
  const signage = name === 'field-card' || name === 'broadcast';

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
        style={{ padding: 16, gap: 14 }}
      >
        {/* The sky half: what the theme looks like before anything lands on it. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <WeatherIcon name={PREVIEW[name].icon} size={72} />

          <View style={{ flex: 1 }}>
            <Text
              color={colors.text}
              style={{
                fontFamily: type.display,
                fontSize: 46,
                lineHeight: 48,
                letterSpacing: -1.6 * type.displayTracking,
              }}
            >
              {PREVIEW[name].temperature}
            </Text>
            <Text
              color={colors.textMuted}
              style={
                signage
                  ? {
                      fontFamily: type.display,
                      fontSize: 16,
                      lineHeight: 22,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      marginTop: 4,
                    }
                  : { fontFamily: type.bodySemibold, fontSize: 16, lineHeight: 22, marginTop: 4 }
              }
            >
              {preview.description}
            </Text>
          </View>

          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: hard ? 6 : 15,
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
                  width: 12,
                  height: 12,
                  borderRadius: hard ? 2 : 6,
                  backgroundColor: colors.surface,
                }}
              />
            ) : null}
          </View>
        </View>

        {/* The panel: raised the way this theme raises surfaces, and holding
            everything the theme would ever draw on a surface. */}
        <View
          style={{
            padding: 14,
            gap: 10,
            borderRadius: Math.max(0, preview.radius.panel - 6),
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
          <Text
            color={colors.textMuted}
            style={{
              fontFamily: type.monoMedium,
              fontSize: 12,
              lineHeight: 16,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Chase index
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <Text
              color={colors.tierText.severe}
              style={{
                fontFamily: type.display,
                fontSize: 38,
                lineHeight: 38,
                letterSpacing: -1.2 * type.displayTracking,
              }}
            >
              72
            </Text>
            <Text
              color={colors.textMuted}
              style={{ fontFamily: type.body, fontSize: 14, lineHeight: 18, paddingBottom: 3 }}
            >
              Severe potential
            </Text>
          </View>

          {/* The tier ladder, in this theme's own values and its own edge. */}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {(['dormant', 'unsettled', 'active', 'severe', 'extreme'] as const).map((level) => (
              <View
                key={level}
                style={{
                  flex: 1,
                  height: 14,
                  borderRadius: hard ? 4 : 3,
                  backgroundColor: colors.tier[level],
                  borderWidth: hard ? 2 : 0,
                  borderColor: colors.border,
                }}
              />
            ))}
          </View>
        </View>

        {/* The name last, the way the page captions its own preview. */}
        <Text
          color={colors.text}
          style={{
            fontFamily: type.monoBold,
            fontSize: 12,
            lineHeight: 16,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {preview.label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
