import { View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  glyph?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  glyph = '◬',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-8 py-16">
      <Text className="mb-4 text-[40px] leading-[44px] text-lightning">{glyph}</Text>
      <Text variant="title" className="mb-2 text-center">
        {title}
      </Text>
      <Text variant="caption" className="mb-6 text-center">
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} tone="secondary" />
      ) : null}
    </View>
  );
}
