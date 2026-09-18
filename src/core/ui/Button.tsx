import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  tone?: ButtonTone;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  tone = 'primary',
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const isDisabled = disabled || loading;

  const fills: Record<ButtonTone, { background: string; label: string; border: string }> = {
    primary: { background: colors.accent, label: colors.onAccent, border: colors.border },
    secondary: { background: 'transparent', label: colors.text, border: colors.text },
    ghost: { background: 'transparent', label: colors.textMuted, border: 'transparent' },
    danger: { background: colors.tier.severe, label: colors.text, border: colors.border },
  };

  const fill = fills[tone];
  // Field Card outlines everything; Skyward only outlines the secondary button.
  const borderWidth =
    theme.borderWidth > 0 && tone !== 'ghost' ? theme.borderWidth : tone === 'secondary' ? 1 : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={[
        {
          // 56px clears the 44px minimum with room for a glove.
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: theme.radius.control,
          paddingHorizontal: 22,
          backgroundColor: fill.background,
          borderWidth,
          borderColor: fill.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fill.label} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text variant="heading" color={fill.label} style={{ fontFamily: theme.type.display }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
