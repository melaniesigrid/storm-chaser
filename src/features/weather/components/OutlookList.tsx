import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { RangeBar } from '@/core/charts/RangeBar';
import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import { formatSpeed, formatTemperature } from '@/core/utils/format';

import { dayLabel } from '../model/dayLabel';
import {
  ICON,
  ROW_GAP,
  TEMP_COLUMN,
  TEMP_GAP,
  barWidthFor,
} from '../model/outlookLayout';
import { iconForCondition } from '../model/weatherIcons';
import type { DailyPoint } from '../model/types';

export function OutlookList({ days }: { days: DailyPoint[] }) {
  const { theme } = useAppTheme();

  /*
   * One measurement for the whole panel rather than one per row: every bar
   * shares a domain, so two bars of different widths would make the same
   * spread look like two different spreads.
   */
  const [rowWidth, setRowWidth] = useState(0);
  const onRowLayout = (event: LayoutChangeEvent) =>
    setRowWidth(event.nativeEvent.layout.width);

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
    <Panel tone="outlook" label="7 day outlook" icon="partly-cloudy-day" style={{ marginBottom: 12 }}>
      {days.map((day, index) => (
        <View
          key={day.date}
          onLayout={index === 0 ? onRowLayout : undefined}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: ROW_GAP,
            paddingVertical: 10,
            borderBottomWidth: index < days.length - 1 ? 1 : 0,
            borderBottomColor: theme.colors.border,
          }}
        >
          {/* Daily rows are always the day variant: a 7 day outlook has no hour. */}
          <WeatherIcon name={iconForCondition(day.condition, false)} size={ICON} />

          {/* The only column that flexes, and the only one that can afford to:
              a truncated weekday is still a weekday, a truncated reading is a
              wrong number. `minWidth: 0` is what lets it shrink at all -- a
              flex child in React Native will not go below its content width
              without it, which is the other half of why the row overflowed. */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="heading" numberOfLines={1}>
              {dayLabel(day.date, index)}
            </Text>
            {/* `caption`, not `figure`: under the weekday this is the second
                line of one column rather than a reading in its own right, and
                at the figure size it was the thing that would not fit. A
                notable gust still lifts onto the severe colour. */}
            <Text
              variant="caption"
              tone={day.maxWindGustKmh >= 60 ? undefined : 'muted'}
              color={day.maxWindGustKmh >= 60 ? theme.colors.tierText.severe : undefined}
              numberOfLines={1}
            >
              {formatSpeed(day.maxWindGustKmh)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: TEMP_GAP }}>
            {/* Both ends of the bar are one size; the low keeps its muted tone,
                which is what carried the hierarchy here anyway. */}
            <Text
              variant="figure"
              tone="muted"
              style={{ width: TEMP_COLUMN, textAlign: 'right' }}
              numberOfLines={1}
            >
              {formatTemperature(day.minTempC)}
            </Text>

            {rowWidth > 0 ? (
              <RangeBar
                low={day.minTempC}
                high={day.maxTempC}
                domainMin={domainMin}
                domainMax={domainMax}
                width={barWidthFor(rowWidth)}
                coldColor={theme.colors.tier.unsettled}
                warmColor={theme.colors.tier.severe}
                trackColor={theme.colors.surfaceSunken}
              />
            ) : null}

            <Text
              variant="figure"
              style={{ width: TEMP_COLUMN, textAlign: 'right' }}
              numberOfLines={1}
            >
              {formatTemperature(day.maxTempC)}
            </Text>
          </View>
        </View>
      ))}

      <Text variant="caption" style={{ marginTop: 12 }}>
        {`Bars share one scale, ${formatTemperature(domainMin)} to ${formatTemperature(domainMax)}, so a short bar really is a steady day.`}
      </Text>
    </Panel>
  );
}
