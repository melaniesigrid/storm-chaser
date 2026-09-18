# Architecture notes

## Layering

The app is feature sliced rather than type sliced. Everything that belongs to
weather lives under `src/features/weather`, everything that belongs to the field
log under `src/features/storms`. Inside a slice the layers run in one direction:

```
components ──▶ hooks ──▶ data / api ──▶ model
     │                                    ▲
     └────────────────────────────────────┘
                (types only)
```

`model/` is the bottom of the stack: pure TypeScript, no React, no I/O, no native
modules. Everything genuinely worth testing lives there, which is why the suite
runs without a renderer, a device or a mocking framework.

Screens under `app/` are thin. They choose which hook to call and how to arrange
components; they never build a URL, touch storage, or contain business rules.

## State ownership

| Kind of state | Owner |
|---|---|
| Server and persisted data | TanStack Query (`weatherKeys`, `stormKeys`) |
| Device capability state | Purpose built hooks (`useDeviceLocation`, `useNetworkStatus`) |
| Ephemeral form and flow state | `useState` inside the screen that owns it |
| Two cross screen facts | Module stores read through `useSyncExternalStore` |

There is no global store for app data. The capture screen reads the weather
snapshot straight from the query cache that the Conditions tab already
populated, so documenting a storm never blocks on the network even though the
report carries full conditions.

Two facts are genuinely cross screen, and both are single values rather than
state trees, so each is a module store with a `useSyncExternalStore` hook rather
than a context:

- `features/location/lastKnownPosition.ts` — the last fix any screen resolved.
  `useDeviceLocation` acquires a fresh fix on mount, which is right for capture
  and wrong for a read only screen that just wants to print "420 km away".
  Opening five legend pins in a row should not mean five permission checks and
  five trips to the satellites. Readers always handle `null`; a null publish is
  ignored, because a hook still requesting is not evidence a good fix went
  stale.
- `core/onboarding/onboardingGate.ts` — a render time cache of the one
  onboarding flag `onboardingStore` owns. The Conditions tab mounts before the
  root layout's redirect to `/onboarding` lands, so without a synchronous read
  the OS location dialog fires over the welcome copy that explains why the app
  wants a position at all. `shouldAutoAcquire` gates acquisition on both this
  flag and the caller's own intent; `unknown` blocks, because guessing wrong is
  exactly that bug.

A context would have to be mounted in the root layout, and in both cases the
first screen to ask is mounted alongside it, not under it.

## Error handling

`Result<T, AppError>` at every boundary, with a typed `kind`:

| Kind | Meaning | UI response |
|---|---|---|
| `not_found` | The service has no data for these coordinates | "Not found" view |
| `network` | Transport failure or timeout | Retry, cached data, offline banner |
| `permission` | Location or camera refused | Permission explainer with a grant action |
| `storage` | Local read or write failed | Inline message, nothing silently lost |

`unwrap()` turns a failed Result into a throw at the query boundary, which is the
one place where throwing is the correct contract.

## Offline strategy

Three layers, in order of preference:

1. **Fresh fetch.** Data is stale after five minutes.
2. **Persisted cache.** The query cache is written to AsyncStorage and kept for 24
   hours, so a cold start with no signal still opens on the last good reading,
   marked with its age.
3. **Bundled sample data.** Explicitly opt in from the Not found view and labelled
   in the UI, so sample readings can never be mistaken for an observation.

The field log itself is local first and needs no network at all.

## Photo lifecycle

Camera output lands in the OS cache directory, which the system may purge at will.
`persistPhoto` copies it to `documentDirectory/storm-photos/<id>.<ext>` before the
record is written. Deletion removes the record first and the file second: an
orphaned file is recoverable, a record pointing at nothing is not.

## Testing approach

291 tests over 14 suites, all targeting logic rather than pixels:

- `format.test.ts` covers every readout the user sees, including negative zero,
  compass wrapping and missing values.
- `severity.test.ts` pins the Chase Index at both ends of the scale, checks
  clamping, checks driver ordering, and asserts that a model which omits CAPE and
  lifted index degrades instead of failing.
- `mappers.test.ts` maps a realistic payload and a deliberately sparse one, and
  covers the hour alignment logic that locates "now" inside the hourly series.
- `stormRepository.test.ts` covers the full CRUD surface, ordering, persistence
  across instances, sync state transitions, corrupt stored data and a failing
  write, using an injected in memory store and a fixed clock.
- `theme.test.ts` computes real WCAG ratios for every token pair in all three
  themes, and guards the brand group: the idle Volt shell against every mood
  fill, the monogram mark against its plate.
- `weatherIcons.test.ts` asserts the component registry covers every declared
  icon name, and that day and night variants map separately.
- `legends.test.ts` and `stormTypes.test.ts` cover the legend table, haversine
  distance, nearest and legend of the day, and the storm type to tier mapping.
- `charts.test.ts` covers the scaling geometry: flat series, single points, a
  forced domain, and non-finite readings, which are dropped rather than scaled.
- `community.test.ts`, `mapRegion.test.ts` and `outlook.test.ts` cover the
  sample community layer, the bounding region fit and the daily outlook rows.
- `autoAcquire.test.ts` and `lastKnownPosition.test.ts` cover the first run
  permission gate and the shared position store described above.


## The theme system

Three themes, one contract. `src/core/theme/themes.ts` is pure data and pure
types: no React, no I/O, no native modules, which is what makes the whole
contract unit testable.

```
themes.ts        the three themes and the token shape (pure)
contrast.ts      WCAG luminance and ratio maths (pure)
themeStore.ts    persistence behind the injected KeyValueStore port
ThemeProvider    owns which theme is active
useAppTheme      the single read point
ThemeCard        an option that paints itself in the theme it offers
```

Five decisions worth calling out:

**Contrast is an assertion, not an opinion.** The previous palette shipped an
offline banner at 1.22:1 and a muted token at 2.0:1. Both looked fine in a list
of hex values. `theme.test.ts` now computes the real ratios and fails the build
if any theme regresses, and keeps those two exact pairs as named guards.

**Tier colour is never the only encoding.** The five level chase ladder has both
a `tier` fill and a `tierText` value, because a yellow fill that reads well on a
meter cannot clear 4.5:1 as text on a white card. Tier is always carried by a
number and a text headline as well as a colour, which is what satisfies WCAG
1.4.1 rather than bending the palette to a contrast floor that does not apply to
fills.

**The display typeface is a theme token.** Skyward uses Bricolage Grotesque,
Field Card uses Archivo Black. Both load up front so switching a theme never
waits on a font. Monospace stays fixed across all three, because columns of
figures have to line up whatever the theme is.

**`brand` is a separate token group from `colors`.** `colors` answers "what does
a panel look like in this theme"; `brand` answers "what do the mark, the ray and
the mascot look like in this theme". Keeping them merged is what produced the
Volt bug: his shell read `colors.accent`, so he was rust on Skyward Day, amber
on Skyward Night and the same fill as the primary button on Field Card. A mascot
is a character, not a control, and it needs its own token or it drifts every
time the accent is retuned. The group carries `voltShell`, `voltShade`,
`voltEye`, `voltGlow`, `ray`, and the monogram plate, mark and radius.

Two assertions guard it in `theme.test.ts`: the idle shell must not collide with
any mood fill, or changing mood would show nothing; and the monogram mark must
clear 3:1 against its plate, which is the non-text floor a large graphic is
actually held to, not the 4.5:1 body floor.

**The sky gradient has four stops, not three.** The third is the haze band at
the horizon. Two stops and a midpoint read as a CSS demo; the band is most of
why Skyward reads as sky. Each theme ships its own `backgroundGradientLocations`
alongside the colours so the stop positions travel with the palette rather than
being hardcoded at the one call site that draws them, and Field Card repeats a
single value four times so the same component renders flat with no branching.

## Icons

Meteocons, rendered natively through `react-native-svg` via
`react-native-svg-transformer`, so a weather glyph is vector at any size.

The animated `@meteocons/svg` package is deliberately unused: its motion is SMIL
embedded in each SVG, and `react-native-svg` does not implement SMIL, so those
files render static at a larger payload. `@meteocons/svg-static` is used instead.

Metro needs static imports, so bundling all 475 icons would cost far more than it
buys. `src/core/icons/names.ts` declares the curated subset as a plain string
union with no imports, which lets the condition mapping in
`features/weather/model/weatherIcons.ts` stay pure and testable while the
component registry lives separately in `WeatherIcon.tsx`.

Day and night variants come from Open-Meteo's `is_day`, requested hourly as well
as currently, rather than from an hour of day guess.

## Motion

Reanimated 4, which requires `react-native-worklets/plugin` as the last Babel
plugin. Without it worklets fail at runtime while everything still typechecks,
so it is the first thing to check if an animation silently does nothing.

Every animation reads `useReducedMotion()`. With Reduce Motion on, the chase
meter snaps to its final state and the confetti does not mount at all, so the
information conveyed is identical and only the theatre is dropped.
