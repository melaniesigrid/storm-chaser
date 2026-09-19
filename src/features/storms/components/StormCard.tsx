import { Image, Pressable, View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Text } from '@/core/ui';
import { formatCoordinates, formatRelativeTime, formatSpeed } from '@/core/utils/format';

import { cardTint } from '@/core/theme/cardTint';
import { chaseLevelForTier, describeStormType, iconForStormType } from '../model/stormTypes';
import type { StormReport } from '../model/types';

export function StormCard({ report, onPress }: { report: StormReport; onPress: () => void }) {
  const { theme } = useAppTheme();
  const type = describeStormType(report.stormType);
  const tint = theme.colors.tier[chaseLevelForTier(type.tier)];
  // Undefined in every theme but Field Card, which is the one that argues a
  // report is a collectible card rather than a row.
  const stock = cardTint(report.id, theme.colors.cardTints) ?? theme.colors.surface;

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
        backgroundColor: stock,
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
      <View style={{ width: 9, backgroundColor: tint }} />

      <View>
        <Image
          source={{ uri: report.photoUri }}
          style={{ height: 124, width: 124 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />

        {/*
          What kind of storm this was, stamped over the corner of the frame.
          A photograph of weather at thumbnail size is mostly grey, so the
          list was asking you to read the label to tell a funnel from a hail
          core. The badge sits on the stock rather than on the photo so it
          stays legible whatever was pointed at, and it is decoration: the
          heading beside it already names the type.
        */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            left: -2,
            bottom: -2,
            padding: 4,
            borderRadius: theme.elevation === 'hard' ? 0 : 16,
            backgroundColor: stock,
            borderWidth: Math.max(theme.borderWidth, 1),
            borderColor: theme.colors.border,
          }}
        >
          <WeatherIcon name={iconForStormType(report.stormType)} size={40} />
        </View>
      </View>

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
