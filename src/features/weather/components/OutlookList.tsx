import { View } from 'react-native';

import { Panel, Text } from '@/core/ui';
import { formatSpeed, formatTemperature } from '@/core/utils/format';

import type { DailyPoint } from '../model/types';

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Today';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}

export function OutlookList({ days }: { days: DailyPoint[] }) {
  if (!days.length) return null;

  return (
    <Panel label="7 day outlook" className="mb-3">
      {days.map((day, index) => (
        <View
          key={day.date}
          className={`flex-row items-center py-2.5 ${index < days.length - 1 ? 'border-b border-bone-200 dark:border-ink-600' : ''}`}
        >
          <Text variant="heading" className="w-14">
            {dayLabel(day.date, index)}
          </Text>
          <Text className="w-8 text-[16px] text-lightning">{day.condition.glyph}</Text>
          <Text variant="caption" className="flex-1" numberOfLines={1}>
            {day.condition.label}
          </Text>
          <Text
            className={`w-24 text-right font-mono text-[12px] ${day.maxWindGustKmh >= 60 ? 'text-supercell' : 'text-ink-500 dark:text-bone-300'}`}
          >
            {formatSpeed(day.maxWindGustKmh)}
          </Text>
          <Text className="w-20 text-right font-monoMedium text-[13px] text-ink-800 dark:text-bone-50">
            {`${formatTemperature(day.maxTempC)} / ${formatTemperature(day.minTempC)}`}
          </Text>
        </View>
      ))}
    </Panel>
  );
}
