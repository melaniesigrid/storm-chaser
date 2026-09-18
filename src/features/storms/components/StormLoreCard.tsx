import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import {
  describeLegendKind,
  formatDistanceKm,
  legendOfTheDay,
  nearestLegend,
} from '@/features/storms/model/legends';
import { iconForStormType } from '@/features/storms/model/stormTypes';
import type { Coordinates } from '@/features/weather/model/types';

export interface StormLoreCardProps {
  /** Used to tell the reader how far they are from it. Omitted when unknown. */
  origin?: Coordinates | null;
  /** Injectable for tests and screenshots; defaults to now. */
  today?: Date;
}

/**
 * The daily storm fact, on the conditions screen.
 *
 * Shows the legend of the day, and separately how far the reader is from the
 * nearest one, because those are almost never the same place and pretending
 * otherwise would make the distance meaningless. The whole card is one target:
 * tapping it opens the legend.
 */
export function StormLoreCard({ origin, today }: StormLoreCardProps) {
  const router = useRouter();
  const { theme } = useAppTheme();

  // Recomputed only when the calendar day changes, not on every render.
  const dayKey = (today ?? new Date()).toDateString();
  const legend = useMemo(() => legendOfTheDay(new Date(dayKey)), [dayKey]);

  const nearest = useMemo(() => (origin ? nearestLegend(origin) : null), [origin]);

  if (!legend) return null;

  return (
    <Panel label="Storm lore" style={{ marginBottom: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${legend.name}. ${legend.claim} Opens the full entry.`}
        onPress={() => router.push({ pathname: '/legend/[id]', params: { id: legend.id } })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <WeatherIcon name={iconForStormType(legend.stormType)} size={56} />
          <View style={{ flex: 1 }}>
            <Text variant="heading">{legend.name}</Text>
            <Text variant="caption" style={{ marginTop: 2 }}>
              {`${legend.place} · ${describeLegendKind(legend.kind).toLowerCase()}`}
            </Text>
          </View>
        </View>

        <Text variant="body" style={{ marginTop: 12 }}>
          {legend.fact}
        </Text>
      </Pressable>

      {nearest ? (
        <View
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text variant="label">Nearest legend</Text>
          <Text variant="caption" style={{ marginTop: 4 }}>
            {`${nearest.legend.name}, ${formatDistanceKm(nearest.distanceKm)} away`}
          </Text>
        </View>
      ) : null}
    </Panel>
  );
}
