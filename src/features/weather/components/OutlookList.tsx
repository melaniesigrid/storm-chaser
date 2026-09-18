import { View } from 'react-native';

import { RangeBar } from '@/core/charts/RangeBar';
import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import { formatSpeed, formatTemperature } from '@/core/utils/format';

import { iconForCondition } from '../model/weatherIcons';
import type { DailyPoint } from '../model/types';

const BAR_WIDTH = 108;

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Today';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}

export function OutlookList({ days }: { days: DailyPoint[] }) {
  const { theme } = useAppTheme();

  if (!days.length) return null;

  /**
   * One domain across all seven rows. Scaling each bar to its own day would
   * make every day look equally variable, which is the opposite of what an
   * outlook is for.
   */
  const lows = days.map((day) => day.minTempC);
  const highs = days.map((day) => day.maxTempC);
  const domainMin = Math.floor(Math.min(...lows) - 1);
  const domainMax = Math.ceil(Math.max(...highs) + 1);

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
          <Text variant="heading" style={{ width: 48 }}>
            {dayLabel(day.date, index)}
          </Text>

          {/* Daily rows are always the day variant: a 7 day outlook has no hour. */}
          <WeatherIcon name={iconForCondition(day.condition, false)} size={30} />

          <Text
            variant="caption"
            color={day.maxWindGustKmh >= 60 ? theme.colors.tierText.severe : undefined}
            style={{ width: 62, fontFamily: theme.type.mono, fontSize: 12 }}
            numberOfLines={1}
          >
            {formatSpeed(day.maxWindGustKmh)}
          </Text>

          <View style={{ flex: 1, alignItems: 'flex-end', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text
                variant="caption"
                style={{ fontFamily: theme.type.mono, fontSize: 13, width: 38, textAlign: 'right' }}
              >
                {formatTemperature(day.minTempC)}
              </Text>

              <RangeBar
                low={day.minTempC}
                high={day.maxTempC}
                domainMin={domainMin}
                domainMax={domainMax}
                width={BAR_WIDTH}
                coldColor={theme.colors.tier.unsettled}
                warmColor={theme.colors.tier.severe}
                trackColor={theme.colors.surfaceSunken}
              />

              <Text
                variant="body"
                style={{
                  fontFamily: theme.type.monoMedium,
                  fontSize: 14,
                  width: 38,
                  textAlign: 'right',
                }}
              >
                {formatTemperature(day.maxTempC)}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <Text variant="caption" style={{ marginTop: 12 }}>
        {`Bars share one scale, ${formatTemperature(domainMin)} to ${formatTemperature(domainMax)}, so a short bar really is a steady day.`}
      </Text>
    </Panel>
  );
}
