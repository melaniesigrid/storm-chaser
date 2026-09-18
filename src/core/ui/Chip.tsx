import { Pressable, View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Tints the outline when the chip carries meaning, e.g. a storm tier. */
  accent?: string;
}

/**
 * Selectable pill, used for storm classification in the capture flow.
 *
 * Previously 26px tall (px-3 py-1.5 around a 14px line box), which is well
 * under the 44px minimum touch target on the single most important control in
 * the app. Now 44px, with the label at 12px instead of 10px.
 */
export function Chip({ label, selected = false, onPress, accent }: ChipProps) {
  const { theme } = useAppTheme();
  const { colors } = theme;

  const outline = selected ? colors.accent : (accent ?? colors.border);

  const body = (
    <View
      style={{
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 22,
        borderWidth: Math.max(theme.borderWidth, selected ? 2 : 1),
        borderColor: outline,
        backgroundColor: selected ? colors.accent : 'transparent',
      }}
    >
      <Text variant="label" color={selected ? colors.onAccent : colors.textMuted}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      {body}
    </Pressable>
  );
}
