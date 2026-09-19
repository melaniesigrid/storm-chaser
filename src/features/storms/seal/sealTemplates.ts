/**
 * The three seals a report can be stamped with.
 *
 * A table rather than three screens, on the same reasoning as `STORM_TYPES`:
 * the picker maps over data, the tests are table-driven, and adding a fourth
 * template is a row rather than a component. It does NOT carry a tier column,
 * because tier is a property of the storm, not of the template.
 */

/** Every instrument a seal can print, named so a template can select them. */
export type SealFieldId =
  | 'temperature'
  | 'wind'
  | 'gust'
  | 'direction'
  | 'pressure'
  | 'humidity'
  | 'cape'
  | 'precipitation';

export type SealTemplateId = 'wax' | 'field-card' | 'collectible';

export interface SealTemplateDefinition {
  id: SealTemplateId;
  label: string;
  /** Shown under the swatch in the picker, so the choice is not a guess. */
  description: string;
  /**
   * Which instruments this template prints, in print order.
   *
   * An explicit list rather than a count. `CapturedConditions` has eleven
   * members and no template prints all eleven: `conditionLabel` is prose
   * rather than a row, `conditionCode` is a lookup key, and `chaseScore` has
   * its own place in the lockup. Naming the list here is what stops the
   * layout from quietly disagreeing with the design.
   */
  fields: SealFieldId[];
  /** Whether the lockup carries the serial and the tier band. */
  collectible: boolean;
}

export const SEAL_TEMPLATES: SealTemplateDefinition[] = [
  {
    id: 'wax',
    label: 'Wax seal',
    description:
      'The photograph, stamped. Coordinates run around the ring like lettering on a coin. Six fields is its ceiling; everything else is left off on purpose.',
    fields: [],
    collectible: false,
  },
  {
    id: 'field-card',
    label: 'Field Card',
    description:
      'The full record, printed on cream stock. Every instrument the report captured, set in the mono face under the classification.',
    fields: [
      'temperature',
      'wind',
      'gust',
      'direction',
      'pressure',
      'humidity',
      'cape',
      'precipitation',
    ],
    collectible: false,
  },
  {
    id: 'collectible',
    label: 'Collectible',
    description:
      'Field Card with a tier band and a serial, and only the four readings a chaser would quote out loud.',
    fields: ['gust', 'pressure', 'cape', 'humidity'],
    collectible: true,
  },
];

const BY_ID = new Map(SEAL_TEMPLATES.map((template) => [template.id, template]));

/** The fallback for an unknown id, taken from the table rather than restated. */
const FIELD_CARD: SealTemplateDefinition =
  BY_ID.get('field-card') ?? SEAL_TEMPLATES[0]!;

/**
 * A template persisted under an id this build no longer knows falls back to
 * Field Card, which prints the most and assumes the least.
 */
export function describeSealTemplate(
  id: SealTemplateId,
): SealTemplateDefinition {
  return BY_ID.get(id) ?? FIELD_CARD;
}
