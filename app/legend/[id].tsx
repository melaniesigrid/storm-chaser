import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ScrollView, View } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Chip, Panel, Text } from '@/core/ui';
import { formatCoordinates } from '@/core/utils/format';
import { useLastKnownPosition } from '@/features/location/lastKnownPosition';
import {
  describeLegendKind,
  findLegend,
  formatDistanceKm,
  haversineKm,
} from '@/features/storms/model/legends';
import { legendImage } from '@/features/storms/model/legendImages';
import {
  chaseLevelForTier,
  describeStormType,
  iconForStormType,
} from '@/features/storms/model/stormTypes';

/**
 * One storm legend, in full.
 *
 * Reads from a bundled table rather than a query: these entries never change,
 * never load and never fail, so there is no skeleton and no error state beyond
 * an unknown id.
 */
export default function LegendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  /**
   * Borrows whatever fix the map (or any screen before this one) already has
   * rather than acquiring its own. A permission prompt and a satellite fix are
   * seconds of latency and real battery for a single "From you" line, paid
   * again for every pin you tap. With no fix published yet the line reads
   * "Position unknown", which is what it said on a denial anyway.
   */
  const coordinates = useLastKnownPosition();

  const legend = findLegend(id);

  if (!legend) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
          padding: 24,
        }}
      >
        <Text variant="title" style={{ marginBottom: 8 }}>
          No such legend
        </Text>
        <Text variant="body" tone="muted" style={{ marginBottom: 24, textAlign: 'center' }}>
          The storm lore is bundled with the app, so this link points at nothing.
        </Text>
        <Button title="Back to the map" tone="secondary" onPress={() => router.replace('/map')} />
      </View>
    );
  }

  const type = describeStormType(legend.stormType);
  const tierLevel = chaseLevelForTier(type.tier);
  // The Chip tints an outline, so it takes the FILL value; the Row draws text on
  // `surface`, which is what `tierText` exists for. Sharing one value here put
  // #F5C242 on white at 1.75:1.
  const tierColor = theme.colors.tier[tierLevel];
  const tierTextColor = theme.colors.tierText[tierLevel];

  const distanceKm = coordinates ? haversineKm(coordinates, legend.coordinates) : null;
  const image = legendImage(legend.id);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      {image ? (
        <View style={{ marginBottom: 12 }}>
          <Image
            source={image.source}
            style={{
              width: '100%',
              height: 220,
              borderRadius: theme.radius.panel,
              backgroundColor: theme.colors.surfaceSunken,
            }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessibilityLabel={image.caption}
          />
          {/*
            The caption says what the photograph actually shows, which is not
            always this legend. Freely licensed photography of a tornado from
            1925 does not exist, so some entries illustrate the phenomenon
            rather than document the event, and the only honest way to use one
            is to say so under it. The credit line is also what the licence
            requires in exchange for using the image at all.
          */}
          <Text variant="caption" style={{ marginTop: 8 }}>
            {image.caption}
          </Text>
          <Text variant="label" style={{ marginTop: 4 }}>
            {`${image.credit} · ${image.license}`}
          </Text>
        </View>
      ) : null}

      <Panel style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text variant="label">{describeLegendKind(legend.kind)}</Text>
            <Text variant="display" style={{ marginTop: 6 }}>
              {legend.name}
            </Text>
            <Text variant="caption" style={{ marginTop: 6 }}>
              {legend.year ? `${legend.place} · ${legend.year}` : legend.place}
            </Text>
          </View>
          {/* With a photograph above it the icon is a classification badge, not
              the illustration, so it drops to the size of one. */}
          <WeatherIcon name={iconForStormType(legend.stormType)} size={image ? 64 : 120} />
        </View>

        <Text variant="message" style={{ marginTop: 12 }}>
          {legend.claim}
        </Text>
      </Panel>

      <Panel label="Why it matters" style={{ marginBottom: 12 }}>
        <Text variant="body">{legend.fact}</Text>

        {legend.story.map((paragraph, index) => (
          <Text key={index} variant="body" style={{ marginTop: 12 }}>
            {paragraph}
          </Text>
        ))}
      </Panel>

      <Panel label="By the numbers" style={{ marginBottom: 12 }}>
        {legend.numbers.map((entry, index) => (
          <Row
            key={entry.label}
            label={entry.label}
            value={entry.value}
            last={index === legend.numbers.length - 1}
          />
        ))}
      </Panel>

      <Panel label="Field notes" style={{ marginBottom: 12 }}>
        <Row label="Classification" value={type.label} accent={tierTextColor} />
        <Row label="When" value={legend.season} />
        <Row
          label="Position"
          value={formatCoordinates(legend.coordinates.latitude, legend.coordinates.longitude, 2)}
        />
        <Row
          label="From you"
          value={distanceKm === null ? 'Position unknown' : formatDistanceKm(distanceKm)}
          last
        />
      </Panel>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Chip label={type.label} accent={tierColor} />
        <Chip label={describeLegendKind(legend.kind)} />
      </View>

      <Button title="See it on the map" onPress={() => router.push('/map')} />
    </ScrollView>
  );
}

function Row({
  label,
  value,
  accent,
  last = false,
}: {
  label: string;
  value: string;
  accent?: string;
  last?: boolean;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="label">{label}</Text>
      <Text
        variant="caption"
        color={accent}
        style={{ flex: 1, textAlign: 'right' }}
      >
        {value}
      </Text>
    </View>
  );
}
