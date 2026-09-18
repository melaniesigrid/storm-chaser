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

There is no global store. The capture screen reads the weather snapshot straight
from the query cache that the Conditions tab already populated, so documenting a
storm never blocks on the network even though the report carries full conditions.

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

28 tests over four suites, all targeting logic rather than pixels:

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
