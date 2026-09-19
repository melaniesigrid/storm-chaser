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
 *
 * Each reading sits under its own dial: the icon at 36 inside a sunken disc,
 * which is what separates four numbers in a grid from four numbers in a list.
 * The icons were at 22 and were decoration; at this size they are the thing you
 * find the reading by.
 */
export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {metrics.map((metric) => (
        <View key={metric.label} style={{ width: '50%', paddingVertical: 12, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            {metric.icon ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{
                  width: 48,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Square in the themes that refuse a curve, round in the ones
                  // that do not: the disc takes the theme's control radius
                  // rather than inventing a shape of its own.
                  borderRadius: Math.min(24, theme.radius.control),
                  backgroundColor: theme.colors.surfaceSunken,
                  borderWidth: theme.borderWidth,
                  borderColor: theme.colors.border,
                }}
              >
                <WeatherIcon name={metric.icon} size={36} />
              </View>
            ) : null}
            <Text variant="label" style={{ flex: 1 }}>{metric.label}</Text>
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
