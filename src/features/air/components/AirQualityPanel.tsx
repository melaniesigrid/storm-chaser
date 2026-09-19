import { View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Skeleton, Text } from '@/core/ui';
import type { Coordinates } from '@/features/weather/model/types';

import { useAirSnapshot } from '../hooks/useAirQuality';
import { pollenBandLabel, uvLabel } from '../model/pollen';
import type { PollenBand, PollenReading } from '../model/types';

/**
 * Air, pollen and UV, under the instruments.
 *
 * Enrichment, and it behaves like it. A second network call on a screen that
 * already makes one must never be able to hurt the first: the panel renders
 * nothing at all while loading past the skeleton, says so plainly when the
 * service has no coverage, and never blocks or degrades the forecast above it.
 */

/**
 * The pollen ladder, drawn from the theme's tier colours.
 *
 * Reusing the tier ladder rather than inventing a second five-step scale is
 * the point: the app already teaches one meaning for "this reading is getting
 * serious", in colours that every theme defines and the contract tests check
 * for contrast. A parallel palette would be a second thing to learn and a
 * second thing to get wrong in Broadcast.
 */
function bandColor(band: PollenBand, tier: { unsettled: string; active: string; severe: string }, muted: string): string {
  switch (band) {
    case 'none':
      return muted;
    case 'low':
      return tier.unsettled;
    case 'moderate':
      return tier.active;
    case 'high':
    case 'very-high':
      return tier.severe;
  }
}

export function AirQualityPanel({ coordinates }: { coordinates: Coordinates | null }) {
  const { theme } = useAppTheme();
  const { data, isLoading, isError } = useAirSnapshot(coordinates);

  if (!coordinates) return null;

  if (isLoading) {
    return (
      <Panel tone="air-quality" label="Air and pollen" icon="raindrops" style={{ marginBottom: 12 }}>
        <Skeleton height={96} />
      </Panel>
    );
  }

  /*
   * A failed enrichment call is not an error the chaser has to act on, so it
   * does not get a banner or a retry button -- it gets a sentence. The
   * forecast above is unaffected and is what the screen is for.
   */
  if (isError || !data) {
    return (
      <Panel tone="air-quality" label="Air and pollen" icon="raindrops" style={{ marginBottom: 12 }}>
        <Text variant="body" tone="muted">
          Air quality could not be read for this position. The conditions above are unaffected.
        </Text>
      </Panel>
    );
  }

  const uv = uvLabel(data.uvIndex);
  const reported = data.pollen.filter((entry) => entry.grainsPerM3 !== null);

  return (
    <Panel tone="air-quality" label="Air and pollen" icon="raindrops" style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: reported.length ? 16 : 0 }}>
        {data.aqi !== null ? (
          <Headline label="Air quality" value={`${Math.round(data.aqi)}`} note={data.aqiLabel} />
        ) : null}
        {data.uvIndex !== null ? (
          <Headline label="UV index" value={`${Math.round(data.uvIndex)}`} note={uv} />
        ) : null}
        {data.pm25 !== null ? (
          <Headline label="PM2.5" value={`${Math.round(data.pm25)}`} note="µg/m³" />
        ) : null}
        {data.pm10 !== null ? (
          <Headline label="PM10" value={`${Math.round(data.pm10)}`} note="µg/m³" />
        ) : null}
      </View>

      {data.pollenUnavailable ? (
        /*
         * "Not modelled here" rather than "no pollen". CAMS covers Europe
         * only, so everywhere else every species is null at once -- and
         * printing "None" over that would be the app stating something it
         * does not know, which is the one thing a field instrument must not do.
         */
        <Text variant="body" tone="muted">
          Pollen is not modelled at this position. The forecast covers Europe only.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {reported.map((entry) => (
            <PollenRow key={entry.species} reading={entry} />
          ))}
          <Text variant="label" tone="muted" style={{ marginTop: 2 }}>
            Grains per cubic metre. Bands are per species: five grains of ragweed is a
            moderate day and five of birch is nothing.
          </Text>
        </View>
      )}
    </Panel>
  );

  function Headline({ label, value, note }: { label: string; value: string; note: string | null }) {
    return (
      <View style={{ minWidth: 92 }}>
        <Text variant="label" tone="muted">
          {label}
        </Text>
        <Text variant="title" style={{ marginTop: 2 }}>
          {value}
        </Text>
        {note ? (
          <Text variant="label" tone="muted">
            {note}
          </Text>
        ) : null}
      </View>
    );
  }

  function PollenRow({ reading }: { reading: PollenReading }) {
    const color = bandColor(reading.band, theme.colors.tierText, theme.colors.textMuted);
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={`${reading.label} pollen, ${pollenBandLabel(reading.band)}, ${Math.round(reading.grainsPerM3 ?? 0)} grains per cubic metre`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <Text variant="body" style={{ flex: 1 }}>
          {reading.label}
        </Text>
        {/*
          The band in words as well as in colour. Colour alone would put the
          whole reading behind normal colour vision, which the theme contract
          refuses everywhere else in this app.
        */}
        <Text variant="label" color={color}>
          {pollenBandLabel(reading.band)}
        </Text>
        <Text variant="label" tone="muted" style={{ minWidth: 52, textAlign: 'right' }}>
          {Math.round(reading.grainsPerM3 ?? 0)}
        </Text>
      </View>
    );
  }
}
