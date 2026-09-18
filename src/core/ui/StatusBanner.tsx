import { View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

export type StatusTone = 'offline' | 'stale' | 'alert';

export interface StatusBannerProps {
  tone: StatusTone;
  message: string;
}

/**
 * Offline, stale and sample-data notices.
 *
 * The previous version hardcoded a dark fill with dark text and no light-mode
 * variant, so in light mode it rendered #080B10 on #1A212C: a contrast ratio of
 * 1.22:1, effectively invisible. Colours now come from the active theme, and it
 * uses the `message` variant rather than the 10px tracked uppercase `label`
 * that whole sentences were being set in.
 */
export function StatusBanner({ tone, message }: StatusBannerProps) {
  const { theme } = useAppTheme();
  const { colors } = theme;

  const accent =
    tone === 'offline'
      ? colors.tier.dormant
      : tone === 'stale'
        ? colors.tier.active
        : colors.tier.severe;

  return (
    <View
      accessibilityRole="alert"
      style={{
        marginBottom: 12,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderWidth: Math.max(theme.borderWidth, 1),
        borderColor: theme.borderWidth > 1 ? colors.border : accent,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: accent }}
      />
      <Text variant="message" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}
