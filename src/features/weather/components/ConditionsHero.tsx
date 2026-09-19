import { type TextStyle } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Panel, Text } from '@/core/ui';
import { formatCoordinates, formatRelativeTime, formatTemperature } from '@/core/utils/format';

import type { Coordinates, WeatherSnapshot } from '../model/types';
import { iconForCondition } from '../model/weatherIcons';

import { VoltPerch } from './VoltPerch';

/** The condition, as big as the column allows. */
const HERO_ICON = 150;

export interface ConditionsHeroProps {
  snapshot: WeatherSnapshot;
  /** Null until the reverse lookup lands, and null forever if it cannot. */
  place: string | null;
  coordinates: Coordinates | null;
}

/**
 * The top of the conditions screen: place, position, condition, reading.
 *
 * The hero runs down the column rather than across it. Side by side, the icon
 * and the temperature were two columns fighting for the same width, and the
 * icon had to stay small to let the reading fit. Stacked, the condition gets
 * to be 150px of weather with the place name over it and the reading under it,
 * which is the shape the marketing page uses and the reason it looks like a
 * poster rather than a table.
 *
 * It is a Panel like every other block on the screen, and whether that Panel
 * draws a surface is the theme's call -- see `conditionsSurface` and the
 * `PanelSurface` the screen wraps its column in. On Skyward there is no card:
 * Meteocons are mostly white and #E6EFFC, the frosted pane composites to
 * near-white in daylight, and the result was a hero with an invisible picture
 * in it.
 *
 * Every line is stretched to the full column and centred inside it rather than
 * shrink-wrapped by `alignItems: 'center'`. A shrink-wrapped box is measured
 * from the font's advance widths, and a display face set with negative
 * tracking paints outside that measurement -- which is what was shaving the
 * ends off the reading and the condition. Stretched, there is slack on both
 * sides of every line and nothing to clip against. `Text` still carries its
 * own bleed for the cases that are not centred.
 */
export function ConditionsHero({ snapshot, place, coordinates }: ConditionsHeroProps) {
  const { theme } = useAppTheme();
  const onSky = theme.conditionsSurface === 'sky';

  /**
   * On a card the supporting lines are muted, which is the right weight
   * against a near-white pane. On the sky they are not: `textMuted` sits just
   * over the AA floor on the top gradient stop, and this is the block the
   * screen is read from. The hero takes the full-strength ink and lets the
   * panels below it keep the hierarchy.
   */
  const support = onSky ? theme.colors.text : undefined;
  const line: TextStyle = { alignSelf: 'stretch', textAlign: 'center' };

  const body = (
    <>
      {place ? (
        <Text variant="title" style={line}>
          {place}
        </Text>
      ) : null}

      <Text
        variant="label"
        color={support}
        style={[line, { marginTop: place ? 4 : 0 }]}
      >
        {coordinates
          ? formatCoordinates(coordinates.latitude, coordinates.longitude, 3)
          : 'Position unknown'}
      </Text>

      <WeatherIcon
        name={iconForCondition(snapshot.current.condition, !snapshot.current.isDay)}
        size={HERO_ICON}
      />

      <Text variant="hero" style={line}>
        {formatTemperature(snapshot.current.temperatureC)}
      </Text>

      <Text variant="title" style={[line, { marginTop: 8 }]}>
        {snapshot.current.condition.label}
      </Text>
      <Text
        variant="caption"
        color={support}
        style={[line, { marginTop: 6 }]}
      >
        {`Feels like ${formatTemperature(snapshot.current.apparentTemperatureC)} · updated ${formatRelativeTime(snapshot.fetchedAt)}`}
      </Text>

      {/*
        Last child, and absolutely positioned: he lands on the empty right
        shoulder the centred hero leaves behind, and paints over everything
        above him rather than under it. Nothing here moves to make room for
        him, before or after he speaks.
      */}
      <VoltPerch group={snapshot.current.condition.group} />
    </>
  );

  return (
    <Panel
      tone="conditions-hero"
      style={{
        marginBottom: 12,
        alignItems: 'center',
        // With no edge under it the hero needs the extra air itself, or the
        // caption sits straight on top of the first panel head.
        ...(onSky ? { paddingBottom: 24 } : null),
      }}
    >
      {body}
    </Panel>
  );
}
