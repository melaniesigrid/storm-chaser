import { View } from 'react-native';

import { normalise } from './geometry';

export interface RangeBarProps {
  low: number;
  high: number;
  /** Shared across every row so bars are comparable down the column. */
  domainMin: number;
  domainMax: number;
  width: number;
  /** Gradient endpoints: cold at the low end, warm at the high end. */
  coldColor: string;
  warmColor: string;
  trackColor: string;
  /** Marks where the current reading sits inside the day's range. */
  marker?: number | null;
  markerColor?: string;
}

/**
 * The daily temperature range, drawn as a bar positioned inside a shared track.
 *
 * Every row uses the same domain, so a short bar sitting far left genuinely
 * means a cold, stable day rather than just a differently scaled one. This is
 * the chart that makes a seven day outlook readable without reading fourteen
 * numbers.
 *
 * Plain views rather than SVG: it is two nested rectangles, and this keeps it
 * cheap inside a list.
 */
export function RangeBar({
  low,
  high,
  domainMin,
  domainMax,
  width,
  coldColor,
  warmColor,
  trackColor,
  marker = null,
  markerColor,
}: RangeBarProps) {
  const start = normalise(Math.min(low, high), domainMin, domainMax);
  const end = normalise(Math.max(low, high), domainMin, domainMax);

  // A day with no spread still needs to be visible, so the bar has a floor.
  const left = start * width;
  const span = Math.max(6, (end - start) * width);

  return (
    <View
      style={{
        width,
        height: 10,
        borderRadius: 5,
        backgroundColor: trackColor,
        overflow: 'hidden',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left,
          width: Math.min(span, width - left),
          height: 10,
          borderRadius: 5,
          backgroundColor: warmColor,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left,
          width: Math.min(span * 0.45, width - left),
          height: 10,
          borderTopLeftRadius: 5,
          borderBottomLeftRadius: 5,
          backgroundColor: coldColor,
          opacity: 0.85,
        }}
      />

      {marker !== null && markerColor ? (
        <View
          style={{
            position: 'absolute',
            left: Math.max(0, Math.min(width - 3, normalise(marker, domainMin, domainMax) * width)),
            width: 3,
            height: 10,
            backgroundColor: markerColor,
          }}
        />
      ) : null}
    </View>
  );
}
