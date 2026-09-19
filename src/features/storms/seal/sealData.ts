/**
 * `StormReport` -> everything a seal prints, as strings and explicit nulls.
 *
 * Pure and total. No hooks, no theme, no device APIs, no clock: every value a
 * seal shows is derived here so the layout can be asserted without a renderer,
 * and so a report that is missing half its data produces a seal rather than a
 * crash or a row of zeroes.
 *
 * The rule throughout: an absent reading is `null`, never `'--'` and never
 * `0`. The layout decides how absence looks; this module only decides whether
 * something is absent.
 */
import {
  formatBearing,
  formatPercent,
  formatPrecipitation,
  formatPressure,
  formatSpeed,
  formatTemperature,
} from '@/core/utils/format';
import type { ChaseLevel } from '@/features/weather/model/types';

import {
  chaseLevelForTier,
  describeStormType,
  type StormTypeDefinition,
} from '../model/stormTypes';
import type { StormReport } from '../model/types';
import { sealSerial } from './sealSerial';
import { describeSealTemplate, type SealFieldId, type SealTemplateId } from './sealTemplates';

/** One printed instrument. `value` is null when the reading was not captured. */
export interface SealField {
  id: SealFieldId;
  /** Short enough for a two-column grid at export size. */
  label: string;
  value: string | null;
}

export interface SealData {
  /** `TORNADO`. Upper case is applied here, not by the layout. */
  classification: string;
  tier: StormTypeDefinition['tier'];
  /** The same ladder the map pins and the chase index use. */
  level: ChaseLevel;

  /**
   * The ring's own coordinate string, e.g. `49.2827°N · 123.1207°W`.
   *
   * Deliberately not `formatCoordinates`, which emits
   * `49.2827° N, 123.1207° W` — a space before each hemisphere letter and a
   * comma-space separator, four glyphs wider against an arc the design
   * already describes as only just fitting.
   */
  ringCoordinates: string | null;
  /** The wider form, for the card templates where there is room for it. */
  cardCoordinates: string | null;
  accuracy: string | null;

  /** `19 SEP 2026`, `16:42`. Split so the ring and the card can differ. */
  date: string;
  time: string;

  conditionLabel: string | null;
  chaseScore: number | null;
  fields: SealField[];

  serial: string;
  /**
   * True when the photograph was imported rather than shot in the field.
   *
   * `types.ts` is explicit that an imported shot carries the conditions and
   * position of the import, not of the storm, and that a log which cannot
   * tell the two apart is not evidence of anything. A seal is that record
   * made public, so it inherits the obligation to say so.
   */
  filedFromLibrary: boolean;
  hasConditions: boolean;
  hasCoordinates: boolean;
}

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * `49.2827°N`, with no space before the hemisphere letter.
 *
 * Hemisphere letters rather than a minus sign, and never both: `-123.1207°W`
 * says west twice and reads as a bug on a printed object.
 */
function ringAxis(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(4)}°${hemisphere}`;
}

/** `19 SEP 2026` and `16:42`, padded so the ring's arc length is stable. */
function splitTimestamp(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { date: 'UNKNOWN DATE', time: '--:--' };
  }
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = MONTHS[parsed.getMonth()] ?? '???';
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return {
    date: `${day} ${month} ${parsed.getFullYear()}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * `'--'` is what the shared formatters return for an absent reading, and it is
 * the right answer inside the app's own panels. On a seal it is not: the
 * layout needs to know a value is missing so it can drop the row rather than
 * print a dash onto something someone is about to post.
 */
function orNull(formatted: string): string | null {
  return formatted === '--' ? null : formatted;
}

const FIELD_LABELS: Record<SealFieldId, string> = {
  temperature: 'TEMP',
  wind: 'WIND',
  gust: 'GUST',
  direction: 'DIR',
  pressure: 'PRES',
  humidity: 'RH',
  cape: 'CAPE',
  precipitation: 'PRCP',
};

function fieldValue(
  id: SealFieldId,
  conditions: NonNullable<StormReport['conditions']>,
): string | null {
  switch (id) {
    case 'temperature':
      return orNull(formatTemperature(conditions.temperatureC));
    case 'wind':
      return orNull(formatSpeed(conditions.windSpeedKmh));
    case 'gust':
      return orNull(formatSpeed(conditions.windGustKmh));
    case 'direction':
      return orNull(formatBearing(conditions.windDirectionDeg));
    case 'pressure':
      return orNull(formatPressure(conditions.pressureHpa));
    case 'humidity':
      return orNull(formatPercent(conditions.humidityPct));
    case 'cape':
      // The one genuinely nullable member of CapturedConditions, and the one
      // a chaser most wants to see. Printed bare: the unit is understood.
      return conditions.capeJkg === null ? null : `${Math.round(conditions.capeJkg)}`;
    case 'precipitation':
      return orNull(formatPrecipitation(conditions.precipitationMm));
  }
}

export interface SealDataOptions {
  /**
   * Supplied by the caller rather than derived here, so the transform stays
   * pure and the derivation stays swappable.
   */
  serial?: string;
}

export function sealData(
  report: StormReport,
  templateId: SealTemplateId,
  options: SealDataOptions = {},
): SealData {
  const type = describeStormType(report.stormType);
  const template = describeSealTemplate(templateId);
  const { date, time } = splitTimestamp(report.capturedAt);
  const conditions = report.conditions;
  const coordinates = report.coordinates;

  return {
    classification: type.label.toUpperCase(),
    tier: type.tier,
    level: chaseLevelForTier(type.tier),

    ringCoordinates: coordinates
      ? `${ringAxis(coordinates.latitude, 'N', 'S')} · ${ringAxis(coordinates.longitude, 'E', 'W')}`
      : null,
    cardCoordinates: coordinates
      ? `${ringAxis(coordinates.latitude, 'N', 'S')} ${ringAxis(coordinates.longitude, 'E', 'W')}`
      : null,
    accuracy:
      report.locationAccuracyM === null
        ? null
        : `±${Math.round(report.locationAccuracyM)} m`,

    date,
    time,

    conditionLabel: conditions?.conditionLabel?.toUpperCase() ?? null,
    chaseScore: conditions ? Math.round(conditions.chaseScore) : null,
    fields: conditions
      ? template.fields.map((id) => ({
          id,
          label: FIELD_LABELS[id],
          value: fieldValue(id, conditions),
        }))
      : [],

    serial: options.serial ?? sealSerial(report.id),
    filedFromLibrary: report.photoSource === 'library',
    hasConditions: conditions !== null,
    hasCoordinates: coordinates !== null,
  };
}
