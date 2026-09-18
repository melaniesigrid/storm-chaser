import { Image, Pressable, View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Text } from '@/core/ui';
import { formatCoordinates, formatRelativeTime, formatSpeed } from '@/core/utils/format';

import { chaseLevelForTier, describeStormType } from '../model/stormTypes';
import type { StormReport } from '../model/types';

export function StormCard({ report, onPress }: { report: StormReport; onPress: () => void }) {
  const { theme } = useAppTheme();
  const type = describeStormType(report.stormType);
  const tint = theme.colors.tier[chaseLevelForTier(type.tier)];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${type.label} report, ${formatRelativeTime(report.capturedAt)}`}
      style={({ pressed }) => ({
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        borderRadius: theme.radius.panel,
        backgroundColor: theme.colors.surface,
        borderWidth: Math.max(theme.borderWidth, 1),
        borderColor: theme.borderWidth > 1 ? theme.colors.border : theme.colors.border,
        opacity: pressed ? 0.85 : 1,
        ...(theme.elevation === 'hard'
          ? {
              shadowColor: theme.colors.border,
              shadowOpacity: 1,
              shadowOffset: { width: 3, height: 3 },
              shadowRadius: 0,
            }
          : {}),
      })}
    >
      {/* Severity rail: the fastest read on a scrolling list. */}
      <View style={{ width: 6, backgroundColor: tint }} />

      <Image
        source={{ uri: report.photoUri }}
        style={{ height: 104, width: 104 }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <View style={{ flex: 1, justifyContent: 'center', padding: 12, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {type.label}
          </Text>
          <Text variant="label">{formatRelativeTime(report.capturedAt)}</Text>
        </View>

        <Text
          variant="caption"
          numberOfLines={1}
          style={{ fontFamily: theme.type.mono, fontSize: 13 }}
        >
          {report.coordinates
            ? formatCoordinates(report.coordinates.latitude, report.coordinates.longitude, 3)
            : 'No position fix'}
        </Text>

        {report.conditions ? (
          <Text variant="caption" numberOfLines={1}>
            {`${report.conditions.conditionLabel} · gusts ${formatSpeed(report.conditions.windGustKmh)}`}
          </Text>
        ) : null}

        {report.notes ? (
          <Text variant="caption" numberOfLines={1} style={{ fontStyle: 'italic' }}>
            {report.notes}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
