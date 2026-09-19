import { View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import type { WeatherIconName } from '@/core/icons/names';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Text } from '@/core/ui';

export interface Metric {
  label: string;
  value: string;
  /** Lifts the value onto the severe tier colour when a reading is notable. */
  emphasis?: boolean;
  icon?: WeatherIconName;
}

/**
 * Two column readout. Metrics are rendered from data rather than hand placed so
 * adding a variable is a one line change in the screen.
 */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {metrics.map((metric) => (
        <View key={metric.label} style={{ width: '50%', paddingVertical: 12, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {metric.icon ? <WeatherIcon name={metric.icon} size={28} /> : null}
            <Text variant="label">{metric.label}</Text>
          </View>
          <Text
            variant="readout"
            color={metric.emphasis ? theme.colors.tierText.severe : undefined}
          >
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
