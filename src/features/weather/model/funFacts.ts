import type { WeatherConditionGroup } from './types';

/**
 * One thing Volt knows.
 *
 * `groups` is what the fact is ABOUT, not a filter that hides it: a fact with
 * no groups is weather in general and is always in the pool. Facts that name a
 * condition are pulled to the front when the sky outside matches, which is the
 * whole trick -- tapping him during a thunderstorm should get you a
 * thunderstorm fact, and tapping him on a clear afternoon should not.
 */
export interface FunFact {
  id: string;
  text: string;
  groups?: readonly WeatherConditionGroup[];
}

/**
 * Every fact has to be true, short enough to read in one breath, and worth the
 * tap. Anything that needed a second sentence to land was cut.
 */
export const FUN_FACTS: readonly FunFact[] = [
  {
    id: 'bolt-hot',
    text: 'A lightning bolt heats the air around it to about 30,000 °C. That is five times the surface of the sun.',
    groups: ['thunderstorm'],
  },
  {
    id: 'thunder-count',
    text: 'Count the seconds between flash and thunder and divide by three. That is how many kilometres away the strike was.',
    groups: ['thunderstorm'],
  },
  {
    id: 'supercell-rotation',
    text: 'A supercell is a storm with a spinning updraft. Only about one in a thousand of them ever drops a tornado.',
    groups: ['thunderstorm', 'hail'],
  },
  {
    id: 'hail-rings',
    text: 'Slice a hailstone and you get rings like a tree. Each one is another trip up through the storm.',
    groups: ['hail'],
  },
  {
    id: 'raindrop-shape',
    text: 'Raindrops are not teardrops. Falling flattens them into tiny hamburger buns.',
    groups: ['rain', 'drizzle', 'shower'],
  },
  {
    id: 'petrichor',
    text: 'That smell after rain has a name: petrichor. It is oil from plants and a compound made by soil bacteria.',
    groups: ['rain', 'drizzle', 'shower'],
  },
  {
    id: 'rain-speed',
    text: 'A big raindrop falls at about 32 km/h. Drizzle takes its time at walking pace.',
    groups: ['drizzle', 'rain'],
  },
  {
    id: 'snowflake-unique',
    text: 'No two snowflakes fall the same way, so no two grow the same. Every one is a record of its own trip down.',
    groups: ['snow'],
  },
  {
    id: 'snow-quiet',
    text: 'Fresh snow makes the world quiet. The gaps between flakes swallow sound like studio foam.',
    groups: ['snow'],
  },
  {
    id: 'fog-cloud',
    text: 'Fog is just a cloud that never left the ground.',
    groups: ['fog'],
  },
  {
    id: 'cloud-weight',
    text: 'An average cumulus cloud weighs about 500 tonnes. It floats because the air under it weighs more.',
    groups: ['cloud', 'clear'],
  },
  {
    id: 'blue-sky',
    text: 'The sky is blue because air scatters short wavelengths hardest. Sunsets are red for the same reason, the long way round.',
    groups: ['clear'],
  },
  {
    id: 'green-flash',
    text: 'On a clear horizon the last sliver of sun can flash green for a second. Sailors spent centuries arguing about it.',
    groups: ['clear'],
  },
  {
    id: 'shower-edge',
    text: 'You can stand in sunshine and watch rain fall across the street. Showers are that small.',
    groups: ['shower'],
  },
  { id: 'pressure-drop', text: 'A falling barometer is the oldest storm warning there is. Air pressure drops before the weather arrives.' },
  { id: 'wind-name', text: 'Wind is named for where it comes from. A north wind blows out of the north, towards you.' },
  { id: 'cape-fuel', text: 'CAPE is the fuel gauge of a storm. Above 1500 J/kg the atmosphere has enough energy to build something serious.' },
  { id: 'coriolis', text: 'Storms spin counter-clockwise north of the equator and clockwise south of it. The planet turning underneath them does that.' },
  { id: 'rainbow-circle', text: 'Every rainbow is a full circle. The ground is the only reason you see an arc.' },
  { id: 'highest-temp-swing', text: 'Loma, Montana once warmed 57 °C in 24 hours. Chinook winds did it in a single night.' },
];

/**
 * The facts that fit the sky right now, most relevant first.
 *
 * Never empty and never filtered down to nothing: the general facts always
 * follow, so a condition nobody wrote a fact for still gets nineteen good
 * answers instead of a blank bubble.
 */
export function factsFor(group: WeatherConditionGroup): readonly FunFact[] {
  const matching = FUN_FACTS.filter((fact) => fact.groups?.includes(group));
  const rest = FUN_FACTS.filter((fact) => !fact.groups?.includes(group));
  return [...matching, ...rest];
}

/**
 * The next fact to show, given the one on screen.
 *
 * A rotation rather than a random draw. Random repeats itself -- with twenty
 * facts, two taps in a row landing on the same one happens often enough to
 * look broken -- and a rotation also means the first tap is always the fact
 * that best fits the weather outside.
 */
export function nextFact(group: WeatherConditionGroup, currentId: string | null): FunFact {
  const pool = factsFor(group);
  const index = currentId === null ? -1 : pool.findIndex((fact) => fact.id === currentId);
  // `FUN_FACTS` is a non-empty literal and `factsFor` only ever reorders it, so
  // the modulo always lands on a fact. The fallback is here for the type
  // checker, and is the first fact rather than a placeholder so that even an
  // impossible pool returns something true.
  return pool[(index + 1) % pool.length] ?? FUN_FACTS[0]!;
}
