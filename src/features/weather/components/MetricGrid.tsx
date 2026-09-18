import { View } from 'react-native';

import { Text } from '@/core/ui';

export interface Metric {
  label: string;
  value: string;
  emphasis?: boolean;
}

/**
 * Two column readout. Metrics are rendered from data rather than hand placed so
 * adding a variable is a one line change in the screen.
 */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <View className="flex-row flex-wrap">
      {metrics.map((metric) => (
        <View key={metric.label} className="w-1/2 py-3">
          <Text variant="label" className="mb-1">
            {metric.label}
          </Text>
          <Text
            variant="readout"
            className={metric.emphasis ? 'text-supercell' : ''}
          >
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
