import { ScrollView, View } from 'react-native';

import { Panel, Text } from '@/core/ui';
import { formatHourLabel, formatPercent, formatTemperature } from '@/core/utils/format';

import type { HourlyPoint } from '../model/types';

export function ForecastStrip({ hours }: { hours: HourlyPoint[] }) {
  if (!hours.length) return null;

  return (
    <Panel label="Next 12 hours" className="mb-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-5 pr-2"
      >
        {hours.map((hour, index) => (
          <View key={hour.time} className="items-center">
            <Text variant="label">{index === 0 ? 'Now' : formatHourLabel(hour.time)}</Text>
            <Text className="my-2 text-[18px] text-lightning">{hour.condition.glyph}</Text>
            <Text className="font-monoMedium text-[15px] text-ink-800 dark:text-bone-50">
              {formatTemperature(hour.temperatureC)}
            </Text>
            <Text variant="caption" className="mt-1 font-mono text-[11px] text-radar">
              {formatPercent(hour.precipitationProbabilityPct)}
            </Text>
            {hour.capeJkg !== null ? (
              <Text variant="caption" className="mt-1 font-mono text-[10px]">
                {Math.round(hour.capeJkg)}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <Text variant="caption" className="mt-3 text-[11px]">
        Rows: temperature, precipitation probability, CAPE (J/kg).
      </Text>
    </Panel>
  );
}
