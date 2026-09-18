import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

export interface PanelProps extends ViewProps {
  label?: string;
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
export function Panel({ label, accessory, style, children, ...rest }: PanelProps) {
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
      {(label || accessory) && (
        <View
          style={{
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {label ? <Text variant="label">{label}</Text> : <View />}
          {accessory}
        </View>
      )}
      {children}
    </View>
  );
}
