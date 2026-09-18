import { Pressable, View } from 'react-native';

import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'neutral' | 'alert' | 'radar';
}

const TONES = {
  neutral: 'border-ink-400 dark:border-ink-500',
  alert: 'border-supercell',
  radar: 'border-radar',
};

export function Chip({ label, selected = false, onPress, tone = 'neutral' }: ChipProps) {
  const body = (
    <View
      className={`rounded-full border px-3 py-1.5 ${selected ? 'border-lightning bg-lightning/15' : TONES[tone]}`}
    >
      <Text
        variant="label"
        className={selected ? 'text-lightning' : ''}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}
