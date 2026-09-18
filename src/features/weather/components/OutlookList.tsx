import { View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import { formatSpeed, formatTemperature } from '@/core/utils/format';

import { iconForCondition } from '../model/weatherIcons';
import type { DailyPoint } from '../model/types';

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Today';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}

export function OutlookList({ days }: { days: DailyPoint[] }) {
  const { theme } = useAppTheme();

  if (!days.length) return null;

  return (
    <Panel label="7 day outlook" style={{ marginBottom: 12 }}>
      {days.map((day, index) => (
        <View
          key={day.date}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 10,
            borderBottomWidth: index < days.length - 1 ? 1 : 0,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text variant="heading" style={{ width: 52 }}>
            {dayLabel(day.date, index)}
          </Text>

          {/* Daily rows are always the day variant: a 7 day outlook has no hour. */}
          <WeatherIcon name={iconForCondition(day.condition, false)} size={30} />

          <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            {day.condition.label}
          </Text>

          <Text
            variant="caption"
            color={day.maxWindGustKmh >= 60 ? theme.colors.tierText.severe : undefined}
            style={{ width: 82, textAlign: 'right', fontFamily: theme.type.mono, fontSize: 13 }}
          >
            {formatSpeed(day.maxWindGustKmh)}
          </Text>

          <Text
            variant="body"
            style={{
              width: 78,
              textAlign: 'right',
              fontFamily: theme.type.monoMedium,
              fontSize: 14,
            }}
          >
            {`${formatTemperature(day.maxTempC)} / ${formatTemperature(day.minTempC)}`}
          </Text>
        </View>
      ))}
    </Panel>
  );
}
