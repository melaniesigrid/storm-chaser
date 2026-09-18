import { View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Weather icon for the state, sized and coloured by the caller. */
  illustration?: React.ReactNode;
}

/**
 * Empty states carry an illustration, a warm line and a way forward. "No items
 * found." is not a design.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}: EmptyStateProps) {
  const { theme } = useAppTheme();

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 56 }}>
      {illustration ? <View style={{ marginBottom: 20 }}>{illustration}</View> : null}

      <Text variant="title" style={{ marginBottom: 10, textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="body" tone="muted" style={{ marginBottom: 26, textAlign: 'center' }}>
        {description}
      </Text>

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          tone="secondary"
          style={{ minWidth: 220, borderColor: theme.colors.text }}
        />
      ) : null}
    </View>
  );
}
