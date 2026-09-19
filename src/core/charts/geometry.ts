/**
 * Chart geometry.
 *
 * Pure maths with no React and no SVG, so the part that is easy to get subtly
 * wrong — scaling, flat series, single points, sparse data — is unit tested
 * rather than eyeballed on a device.
 *
 * SVG y grows downward, so every helper here inverts: the largest value maps to
 * the smallest y.
 */

import { clamp } from '@/core/utils/clamp';

export interface Point {
  x: number;
  y: number;
}

export interface ScaleOptions {
  width: number;
  height: number;
  /** Keeps stroke width and dots from being clipped at the edges. */
  padding?: number;
  /** Forces the domain instead of deriving it from the values. */
  min?: number;
  max?: number;
}

/**
 * Maps a series onto pixel coordinates.
 *
 * A flat series (every value identical) has no range to divide by; it is drawn
 * along the vertical centre rather than at the top, which is what a reader
 * expects from "nothing is changing".
 */
export function scaleSeries(values: number[], options: ScaleOptions): Point[] {
  const { width, height } = options;
  const padding = options.padding ?? 0;

  if (!values.length) return [];

  const usableWidth = Math.max(0, width - padding * 2);
  const usableHeight = Math.max(0, height - padding * 2);

  // The domain comes from the finite readings only. A single null or NaN in the
  // series would otherwise make Math.min/Math.max NaN, which propagates into
  // every point and blanks the whole chart rather than losing one reading.
  const finite = compact(values);
  const min = options.min ?? (finite.length ? Math.min(...finite) : 0);
  const max = options.max ?? (finite.length ? Math.max(...finite) : 0);

  return values.map((value, index) => {
    const t = values.length === 1 ? 0.5 : index / (values.length - 1);

    return {
      x: padding + t * usableWidth,
      // `normalise` already centres a flat series, clamps to the box and
      // refuses to emit NaN, which is exactly the behaviour wanted here.
      y: padding + (1 - normalise(value, min, max)) * usableHeight,
    };
  });
}

/** An open polyline through the points. Empty string for an empty series. */
export function toLinePath(points: Point[]): string {
  if (!points.length) return '';

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
    .join(' ');
}

/**
 * A closed path from the line down to a baseline, for the filled area under a
 * sparkline. Needs at least two points: one point has no area.
 */
export function toAreaPath(points: Point[], baselineY: number): string {
  if (points.length < 2) return '';

  const first = points[0] as Point;
  const last = points[points.length - 1] as Point;

  return `${toLinePath(points)} L${round(last.x)} ${round(baselineY)} L${round(first.x)} ${round(
    baselineY,
  )} Z`;
}

/**
 * A smoothed path using Catmull-Rom converted to cubic beziers.
 *
 * Temperature over twelve hours is a continuous physical quantity, so a curve
 * reads more honestly than hard corners. Tension 0 is the standard uniform
 * Catmull-Rom; the curve always passes through every real data point, so
 * smoothing never invents a reading that was not measured.
 */
export function toSmoothPath(points: Point[]): string {
  if (points.length < 3) return toLinePath(points);

  const first = points[0] as Point;
  let path = `M${round(first.x)} ${round(first.y)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)] as Point;
    const p1 = points[i] as Point;
    const p2 = points[i + 1] as Point;
    const p3 = points[Math.min(points.length - 1, i + 2)] as Point;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(p2.x)} ${round(
      p2.y,
    )}`;
  }

  return path;
}

/**
 * Where a value sits between two bounds, clamped to 0..1.
 *
 * Used for bar heights, where a reading outside the expected domain should
 * flatten or fill rather than overflow the chart.
 */
export function normalise(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (max === min) return 0.5;

  return clamp((value - min) / (max - min), 0, 1);
}

/** Drops nulls so a sparse API series can still be charted. */
export function compact(values: (number | null | undefined)[]): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
