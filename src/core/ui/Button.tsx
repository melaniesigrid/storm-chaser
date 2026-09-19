import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type EasingFunction,
} from 'react-native-reanimated';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The three easings the motion contract names, resolved to real curves.
 *
 * `snap` is not an easing so much as a refusal to have one: Field Card is a
 * printed object, and printed objects do not accelerate.
 */
const EASINGS: Record<'inOut' | 'linear' | 'snap', EasingFunction> = {
  inOut: Easing.inOut(Easing.quad),
  linear: Easing.linear,
  snap: Easing.steps(1, true),
};

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
  const { colors, motion } = theme;
  const isDisabled = disabled || loading;

  /*
   * Press feedback comes from the theme, not from this file. Skyward eases down
   * to 0.97 over 140ms; Field Card's `pressScale` is 1, because a printed card
   * answers a press by moving onto its own shadow rather than by shrinking.
   * Reduce Motion drops the scale entirely -- the button still reports the
   * press through its pressed colour and its accessibility state.
   */
  const reduceMotion = useReducedMotion();
  const press = useSharedValue(1);

  const animateTo = (value: number) => {
    if (reduceMotion || motion.pressScale === 1) return;
    press.value = withTiming(value, {
      duration: motion.pressDurationMs,
      easing: EASINGS[motion.pressEasing],
    });
  };

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

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
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPressIn={() => animateTo(motion.pressScale)}
      onPressOut={() => animateTo(1)}
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
        pressStyle,
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
    </AnimatedPressable>
  );
}
