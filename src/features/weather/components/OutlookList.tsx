import { useMemo } from 'react';
import { View } from 'react-native';

import { RangeBar } from '@/core/charts/RangeBar';
import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import { formatSpeed, formatTemperature } from '@/core/utils/format';

import { dayLabel } from '../model/dayLabel';
import { iconForCondition } from '../model/weatherIcons';
import type { DailyPoint } from '../model/types';

const BAR_WIDTH = 108;

export function OutlookList({ days }: { days: DailyPoint[] }) {
  const { theme } = useAppTheme();

  /**
   * One domain across all seven rows. Scaling each bar to its own day would
   * make every day look equally variable, which is the opposite of what an
   * outlook is for.
   *
   * Memoised because every row's bar is positioned against it: recomputing two
   * spreads over the week on each parent render re-renders seven bars that did
   * not move.
   */
  const { domainMin, domainMax } = useMemo(() => {
    if (!days.length) return { domainMin: 0, domainMax: 0 };

    const lows = days.map((day) => day.minTempC);
    const highs = days.map((day) => day.maxTempC);

    return {
      domainMin: Math.floor(Math.min(...lows) - 1),
      domainMax: Math.ceil(Math.max(...highs) + 1),
    };
  }, [days]);

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
          <Text variant="heading" style={{ width: 48 }}>
            {dayLabel(day.date, index)}
          </Text>

          {/* Daily rows are always the day variant: a 7 day outlook has no hour. */}
          <WeatherIcon name={iconForCondition(day.condition, false)} size={38} />

          {/* `figure`, not `label`: label uppercases, and a formatted reading
              is "45 km/h", not an instrument name. Widened from 62 to hold a
              three figure gust at the larger mono size without truncating. */}
          <Text
            variant="figure"
            tone={day.maxWindGustKmh >= 60 ? undefined : 'muted'}
            color={day.maxWindGustKmh >= 60 ? theme.colors.tierText.severe : undefined}
            style={{ width: 70 }}
            numberOfLines={1}
          >
            {formatSpeed(day.maxWindGustKmh)}
          </Text>

          <View style={{ flex: 1, alignItems: 'flex-end', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Both ends of the bar are one size now; the low keeps its muted
                  tone, which is what carried the hierarchy here anyway. Width
                  is up from 38 to fit the larger mono glyphs. */}
              <Text variant="figure" tone="muted" style={{ width: 44, textAlign: 'right' }}>
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

              <Text variant="figure" style={{ width: 44, textAlign: 'right' }}>
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
