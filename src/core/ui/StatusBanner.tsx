import { View } from 'react-native';

import { Text } from './Text';

type Tone = 'offline' | 'stale' | 'alert';

const TONES: Record<Tone, string> = {
  offline: 'bg-ink-600',
  stale: 'bg-lightning/20 border border-lightning/40',
  alert: 'bg-supercell/20 border border-supercell/50',
};

export interface StatusBannerProps {
  tone: Tone;
  message: string;
}

export function StatusBanner({ tone, message }: StatusBannerProps) {
  return (
    <View
      accessibilityRole="alert"
      className={`mb-3 rounded-xl px-3 py-2 ${TONES[tone]}`}
    >
      <Text variant="label" className="text-ink-800 dark:text-bone-100">
        {message}
      </Text>
    </View>
  );
}
