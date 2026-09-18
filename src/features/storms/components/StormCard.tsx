import { Image, Pressable, View } from 'react-native';

import { Text } from '@/core/ui';
import { formatCoordinates, formatRelativeTime, formatSpeed } from '@/core/utils/format';

import { describeStormType } from '../model/stormTypes';
import type { StormReport } from '../model/types';

const TIER_ACCENT = {
  severe: 'bg-supercell',
  notable: 'bg-lightning',
  routine: 'bg-radar',
} as const;

export function StormCard({
  report,
  onPress,
}: {
  report: StormReport;
  onPress: () => void;
}) {
  const type = describeStormType(report.stormType);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${type.label} report, ${formatRelativeTime(report.capturedAt)}`}
      className="mb-3 flex-row overflow-hidden rounded-panel border border-bone-200 bg-white active:opacity-80 dark:border-ink-500 dark:bg-ink-700"
    >
      <View className={`w-1 ${TIER_ACCENT[type.tier]}`} />
      <Image
        source={{ uri: report.photoUri }}
        className="h-24 w-24"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View className="flex-1 justify-center p-3">
        <View className="mb-1 flex-row items-center justify-between">
          <Text variant="heading">{type.label}</Text>
          <Text variant="label">{formatRelativeTime(report.capturedAt)}</Text>
        </View>

        <Text variant="caption" numberOfLines={1} className="font-mono text-[11px]">
          {report.coordinates
            ? formatCoordinates(
                report.coordinates.latitude,
                report.coordinates.longitude,
                3,
              )
            : 'No position fix'}
        </Text>

        {report.conditions ? (
          <Text variant="caption" numberOfLines={1} className="mt-1">
            {`${report.conditions.conditionLabel} · gusts ${formatSpeed(report.conditions.windGustKmh)}`}
          </Text>
        ) : null}

        {report.notes ? (
          <Text variant="caption" numberOfLines={1} className="mt-1 italic">
            {report.notes}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
