# Storm Chaser

A field app for storm chasing hobbyists. It pulls live conditions for wherever you
are standing, scores how interesting the atmosphere is, and turns a photograph into
a timestamped, geotagged, weather stamped report that lives on the device.

Built for the Speer Technologies mobile assessment.

| | |
|---|---|
| Stack | React Native, Expo SDK 57, TypeScript (strict), Expo Router |
| Data | TanStack Query with an AsyncStorage persister |
| Styling | Three switchable themes behind one token contract |
| Icons | Meteocons, rendered natively through `react-native-svg` |
| Motion | Reanimated 4, with Reduce Motion honoured |
| Storage | AsyncStorage for records, app document directory for photos |
| Platforms | iOS and Android from one codebase |
| Showcase | [stormchaser-field.vercel.app](https://stormchaser-field.vercel.app) |

---

## Running it

```bash
npm install
npx expo install --fix     # aligns native module versions with the installed SDK
npx expo start
```

Camera, location and maps need a real device or a development build. Expo Go works
for everything except a custom map provider on Android.

`expo-asset` is declared as a direct dependency on purpose: `expo-font` requires
it at runtime, and without the explicit entry npm can leave it nested where Metro
cannot resolve it.

```bash
npm test          # unit tests
npm run typecheck # tsc --noEmit
```

No API keys are required. Open-Meteo is keyless, and cloud sync stays disabled
unless `EXPO_PUBLIC_SYNC_BASE_URL` is set (see `.env.example`).

---

## What it does

### Themes

Three themes, switchable in onboarding and in Settings: **Skyward Day**,
**Skyward Night** and **Field Card**. No screen knows which one is active. Every
colour, typeface and radius resolves through a named token, so adding a fourth
is a data change rather than a UI change. The display typeface is itself a theme
token, which is why Field Card reads as a collectible card and Skyward reads as
sky.

A user's explicit choice overrides system appearance permanently. A field app
that flips to a light theme at sunrise while someone is out chasing is wrong,
so the OS setting only decides the default before a choice has been made.

Contrast is a unit test rather than a judgement call. `theme.test.ts` asserts
WCAG AA for body text, muted text, both tab states and the primary action across
all three themes, and carries regression guards for two defects that shipped in
the first version: an offline banner rendering at **1.22:1** in light mode and a
muted token at **2.0:1** in dark mode.

### Conditions

Reads a position fix, then pulls current conditions, a 12 hour hourly series and a
7 day outlook from Open-Meteo. Alongside the usual temperature and wind figures it
surfaces the two variables a chaser actually cares about: CAPE and lifted index.

Those feed a **Chase Index**, a 0 to 100 heuristic combining the observed weather
code, gust strength, rainfall rate and the convective indices, plus a ranked list
of the factors driving the score. It is a judgement aid, not a forecast product,
and the maths lives in one pure, tested module (`features/weather/model/severity.ts`).

If nothing can be retrieved the screen shows an explicit **Not found** view that
names the failure and offers two ways forward: retry, or fall back to the bundled
sample dataset (clearly labelled as sample data in the UI).

### Field log

Camera capture, then a metadata form. Classification and notes are typed by the
user; time, coordinates, position accuracy and the full weather snapshot are
captured automatically and shown read only so they can be verified before saving.

Photo first, record second: if the image cannot be copied into permanent storage
the report is never written, so the log can never contain an entry pointing at a
file that is not there.

### Map

Every report with a position fix, plotted and coloured by severity tier, with the
viewport fitted to the set. Tapping a callout opens the report.

### Community

Storms other chasers logged, plotted around you as hollow rings so someone
else's report can never be mistaken for one of your own at a glance. With no
sync backend configured they come from a bundled sample set, generated relative
to your position and clearly badged **community · demo data** in the legend.
They are a separate type from your reports and never enter the repository.

### First run and delight

Onboarding runs once: welcome, location, then theme choice, so someone picks
their look before they ever see the app. Saving a report fires a confetti burst
and a success haptic over the field log, which is where the new report just
landed. Volt, the mascot, is pure geometry with no image assets; his level of
detail follows the theme rather than a prop.

Every motion respects Reduce Motion. With it on, the confetti and the meter
animation are skipped entirely and the information is identical.

---

## Architecture

Feature sliced, with a strict dependency direction:

```
app/                       Expo Router routes. Screens compose, they do not fetch.
src/core/                  Design tokens, shared UI kit, pure utilities.
src/features/<feature>/
    api/                   Wire contracts and HTTP clients.
    model/                 Domain types and pure logic. No React, no I/O.
    data/                  Persistence ports and adapters.
    hooks/                 TanStack Query bindings. The only async entry point for UI.
    components/            Feature specific presentation.
src/services/              Cross cutting: query client, network probe, cloud sync.
```

`model/` never imports from `hooks/` or `components/`. That is what makes the
interesting logic testable without a renderer or a native module.

Three decisions worth calling out:

**Repository pattern over a storage port.** `StormRepository` depends on a three
method `KeyValueStore` interface, not on AsyncStorage. The clock and the id
generator are injected too. The result is a data layer with real test coverage and
no mocking framework, and a one line change to move to SQLite or MMKV when the log
outgrows a single JSON envelope. Records are stored under one versioned key with a
migration hook already in place.

**Result types instead of exceptions at the boundaries.** Every client and
repository method returns `Result<T, AppError>` with a typed error kind. That is
what lets the UI distinguish "no data for these coordinates" (a Not found view)
from "the radio is off" (an offline banner over cached data) rather than showing
one generic error for both. `unwrap()` converts to a throw at the query boundary,
where TanStack Query expects one.

**Weather denormalised onto the report.** A field log entry has to stay readable
years later, and no forecast API serves historical conditions for an arbitrary past
timestamp. The snapshot is copied onto the record at capture time rather than
referenced.

---

## Brief coverage

| Requirement | Status |
|---|---|
| Current weather from device location | Open-Meteo, keyless, live |
| Meteorological detail for chasers | Temp, apparent temp, wind, gusts, bearing, pressure, humidity, cloud, precipitation, CAPE, lifted index |
| "Not found" view | Dedicated component, with retry and sample data fallback |
| Camera capture | `expo-camera`, photo copied to app document storage |
| Photo metadata | Conditions, coordinates, accuracy, date and time, notes, classification |
| Local persistence | AsyncStorage envelope plus file storage, versioned, migration hook |
| Navigation | Expo Router, three tabs plus a modal capture flow and a detail route |
| Forecast integration | 12 hour hourly strip and 7 day outlook |
| Map visualisation | `react-native-maps`, severity coloured pins, auto fitted region |
| Offline functionality | Persisted query cache (24 h), offline and stale banners, bundled sample data |
| Dark mode | Three themes including a dedicated night theme, system aware until the user chooses |
| Skeleton screens | Layout matched skeletons on both data screens |
| Pull to refresh | Conditions and field log |
| Cloud integration | Upload client plus a community feed; no keys, sample-backed unless configured |
| Unit tests | 104 tests across formatting, severity, mapping, the repository, the theme contract, the icon mapping and the community layer |

### Known limits

- Cloud sync is the client half only, as the brief specifies. There is no backend,
  and nothing is uploaded; `syncState` is modelled and stored but only ever moves
  when a configured sync target exists.
- The network probe polls every 15 seconds rather than subscribing to an event
  stream. A production build would use NetInfo and TanStack Query's `onlineManager`.
- Tests cover the domain, data and theme layers. Component rendering tests are
  still out: the suite has no renderer, which is why contrast and icon mapping
  are asserted as pure functions instead. That is where I would spend the next
  hour.
- Community reports resolve from a bundled sample set, because the brief asks
  for cloud integration code with no backend and no keys. They travel the same
  `fetchCommunityReports` signature and the same `Result` boundary a configured
  build would use, and the map badges them as demo data rather than passing
  fictional chasers off as real.
- One JSON envelope for all reports is right at this scale and wrong past a few
  thousand entries. The migration path is noted in the repository.

See `docs/ARCHITECTURE.md` for the longer version, `docs/AI_DISCLOSURE.md` for AI
tool usage, and `docs/TIME_LOG.md` for the time breakdown.
