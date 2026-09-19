import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import type { WeatherIconName } from '@/core/icons/names';
import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

/**
 * Big enough to be a mark rather than a bullet.
 *
 * Meteocons are drawn as illustrations -- a cloud with a bolt coming out of it
 * has real detail in it -- and at the 16px a label row would normally give an
 * icon they turn to mush. This is the one size every panel head uses, so the
 * cards line up down a scroll.
 */
const PANEL_ICON = 34;

export interface PanelProps extends ViewProps {
  label?: string;
  /**
   * A mark for the label row. Decoration: the label beside it already says
   * what the panel is, so the icon is hidden from the screen reader rather
   * than announced as a second, wordless copy of the heading.
   */
  icon?: WeatherIconName;
  accessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single surface primitive. Every card in the app is a Panel, so corner
 * radius, border treatment and elevation stay identical across screens and
 * change together when the theme changes.
 *
 * Elevation is a theme decision, not a per-card one: Skyward Day lifts with a
 * soft shadow, Skyward Night with a faint glow, Field Card with a hard offset
 * block shadow and a 3px outline.
 */
export function Panel({ label, icon, accessory, style, children, ...rest }: PanelProps) {
  const { theme } = useAppTheme();
  const { colors } = theme;

  const elevation: ViewStyle =
    theme.elevation === 'hard'
      ? {
          shadowColor: colors.border,
          shadowOpacity: 1,
          shadowOffset: { width: 4, height: 4 },
          shadowRadius: 0,
          elevation: 0,
        }
      : theme.elevation === 'glow'
        ? {
            shadowColor: colors.tier.extreme,
            shadowOpacity: 0.28,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 16,
            elevation: 0,
          }
        : {
            shadowColor: '#14213A',
            shadowOpacity: 0.14,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 18,
            elevation: 3,
          };

  return (
    <View
      style={[
        {
          borderRadius: theme.radius.panel,
          backgroundColor: colors.surface,
          borderWidth: theme.borderWidth,
          borderColor: colors.border,
          padding: 16,
        },
        elevation,
        style,
      ]}
      {...rest}
    >
      {(label || icon || accessory) && (
        <View
          style={{
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          {icon ? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <WeatherIcon name={icon} size={PANEL_ICON} />
            </View>
          ) : null}
          {label ? <Text variant="label" style={{ flex: 1 }}>{label}</Text> : <View style={{ flex: 1 }} />}
          {accessory}
        </View>
      )}
      {children}
    </View>
  );
}
