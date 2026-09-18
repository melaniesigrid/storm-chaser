import { View } from 'react-native';

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
    <Panel className="items-center px-5 py-10">
      <Text className="mb-4 text-[40px] leading-[44px] text-supercell">⌁</Text>
      <Text variant="title" className="mb-2 text-center">
        {title}
      </Text>
      <Text variant="caption" className="mb-6 text-center">
        {reason}
      </Text>
      <View className="w-full gap-3">
        <Button title="Try again" onPress={onRetry} />
        {onUseSample ? (
          <Button title="Use sample data" tone="secondary" onPress={onUseSample} />
        ) : null}
      </View>
    </Panel>
  );
}
