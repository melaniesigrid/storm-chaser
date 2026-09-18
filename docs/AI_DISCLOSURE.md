# AI tool disclosure

The assessment permits AI assistance and asks for a disclosure. This is a complete
and honest account.

## Tools used

| Tool | Role |
|---|---|
| Claude (Anthropic) | Primary implementation assistant across the whole repository |

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

## Verification

Generated code was not taken on trust. The domain and data layers are covered by
28 unit tests run under strict TypeScript, the app was exercised on a device for
every flow in the brief, and I corrected the model's output where it was wrong.
Two examples worth naming, since a disclosure that claims the AI got everything
right is not a useful disclosure:

1. The first cut of `formatTemperature` returned `-0°` for readings between -0.5
   and 0. Caught by a unit test, fixed with an explicit normalisation.
2. The first version of the repository exposed `markSyncState` calling `this.update`
   on an object literal, which breaks the moment the repository is destructured.
   Rewritten to close over an extracted function.
