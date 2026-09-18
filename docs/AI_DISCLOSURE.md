# AI tool disclosure

The assessment permits AI assistance and asks for a disclosure. This is a complete
and honest account.

## Tools used

| Tool | Role |
|---|---|
| Claude (Anthropic) | Primary implementation assistant across the whole repository |
| Claude Code (Anthropic) | Session two: agentic implementation of the theme system, the visual rebuild and the landing page |

No other AI tools were used. No code was copied from a public storm chasing or
weather app.

## How it was used

I worked with Claude the way I work with a pair: I set the architecture, the
product decisions and the acceptance bar, and used the model to produce
implementation at speed, then reviewed, ran and corrected everything before it
landed.

**Directed by me, not the model**

- The layering (feature slices, `model/` as a pure bottom layer, screens kept thin)
- Choosing a repository behind an injected `KeyValueStore` port over calling
  AsyncStorage directly, so the data layer is testable without native modules
- `Result<T, AppError>` with typed error kinds at every boundary, and the mapping
  from error kind to UI response
- Denormalising the weather snapshot onto each report rather than referencing it
- The Chase Index concept and which meteorological inputs it should weigh
- Photo first then record ordering, and the reverse ordering on delete
- The three tier offline strategy and what each tier is allowed to display
- The visual direction: instrument console aesthetic, mono readouts, the palette

**Generated with Claude assistance, then reviewed**

| Area | Notes |
|---|---|
| Domain logic (`severity.ts`, `mappers.ts`, `format.ts`, `weatherCodes.ts`) | Drafted with Claude to my spec, then verified against the unit suite. The WMO code table and the Open-Meteo response contract were checked against the published API documentation. |
| Data layer (`StormRepository.ts`, `KeyValueStore.ts`, `photoStore.ts`) | Structure and injection points were mine; the implementation was drafted with Claude and reviewed line by line. |
| UI kit and screens (`src/core/ui`, `app/`) | Largest share of generated code. Component API and styling direction were mine. |
| Unit tests | Cases were chosen by me (boundaries, sparse payloads, corrupt storage, failing writes); the assertions were drafted with Claude. |
| Documentation (this file, README, architecture notes) | Drafted with Claude from my notes and edited by me. |

**Not AI generated**

- The decision about what to build and what to cut inside the time limit
- Device testing, the screen recording and the final review pass

## Session two: a larger share of generation

The theme system, the visual rebuild, the onboarding flow and the landing page
were built in a second session using Claude Code, which writes and runs code
directly rather than proposing snippets. The share of machine written code is
materially higher here than in session one, and it would be misleading to
describe the two sessions the same way.

**Directed by me**

- Approving three themes rather than one, and that the display typeface is a
  theme token rather than a global constant (Bricolage Grotesque for the two
  Skyward themes, Archivo Black for Field Card)
- Choosing the design direction from generated comparison boards, then the logo
  direction, the mascot brief ("one square, two eyes") and its level of detail
  per theme
- That a user's explicit theme choice overrides system appearance permanently
- That celebration fires on every saved report, and where it fires
- Adopting Meteocons as the icon set

**Generated with Claude Code, then reviewed and run**

| Area | Notes |
|---|---|
| Theme system (`src/core/theme/*`) | Token contract, three themes, persistence and the contrast module. I set the requirement that contrast be a test rather than a judgement call. |
| Visual rebuild (`src/core/ui`, all screens) | Type scale, every component and screen moved onto theme tokens. Largest share of generated code in the repository. |
| Icon layer (`src/core/icons`, `weatherIcons.ts`) | Curated Meteocons subset and the day/night condition mapping. |
| Onboarding, theme picker, confetti, Volt | Drafted end to end, then adjusted: the mascot was made minimal in the Skyward themes and detailed only in Field Card at my direction. |
| Landing page (`landing/`) | Generated, then deployed to Vercel. |

**A correction worth naming from session two**

The model proposed using `@meteocons/svg`, the animated icon package. Inspecting
the package showed its motion is SMIL embedded in each SVG, and `react-native-svg`
does not implement SMIL, so those files would have rendered as static icons at a
larger payload. The app uses `@meteocons/svg-static` instead. It also wrote a
contrast assertion requiring tier fill colours to clear 3:1 against the surface,
which is unachievable for a yellow fill on a white card and is not required when
the tier is also encoded as a number and a text label; the assertion was wrong
and was removed rather than the palette being bent to satisfy it.

## Verification

Generated code was not taken on trust. The domain, data and theme layers are
covered by 91 unit tests run under strict TypeScript, the app was exercised on a device for
every flow in the brief, and I corrected the model's output where it was wrong.
Two examples worth naming, since a disclosure that claims the AI got everything
right is not a useful disclosure:

1. The first cut of `formatTemperature` returned `-0°` for readings between -0.5
   and 0. Caught by a unit test, fixed with an explicit normalisation.
2. The first version of the repository exposed `markSyncState` calling `this.update`
   on an object literal, which breaks the moment the repository is destructured.
   Rewritten to close over an extracted function.
