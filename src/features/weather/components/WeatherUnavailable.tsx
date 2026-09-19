import { View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { Button, Panel, Text } from '@/core/ui';

export interface WeatherUnavailableProps {
  title?: string;
  reason: string;
  onRetry: () => void;
  onUseSample?: () => void;
}

/**
 * The "Not found" view required by the brief. It states what failed, what the
 * app tried, and gives two ways forward rather than dead ending the user.
 */
export function WeatherUnavailable({
  title = 'No weather data found',
  reason,
  onRetry,
  onUseSample,
}: WeatherUnavailableProps) {
  return (
    <Panel style={{ alignItems: 'center', paddingHorizontal: 20, paddingVertical: 36 }}>
      <WeatherIcon name="not-available" size={104} />

      <Text variant="title" style={{ marginTop: 18, marginBottom: 8, textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="body" tone="muted" style={{ marginBottom: 24, textAlign: 'center' }}>
        {reason}
      </Text>

      <View style={{ width: '100%', gap: 12 }}>
        <Button title="Try again" onPress={onRetry} />
        {onUseSample ? (
          <Button title="Use sample data" tone="secondary" onPress={onUseSample} />
        ) : null}
      </View>
    </Panel>
  );
}
