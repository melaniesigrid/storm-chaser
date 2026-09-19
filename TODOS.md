# TODOS

Open work, grouped by area then priority. P0 is "before anyone else sees this",
P4 is "someday". Completed items move to the bottom with the version that
closed them.

## Submission

### Screen recording link is a placeholder
**Priority:** P0
**Files:** `landing/index.html` (deliverable 4), `docs/` 
Deliverable 4 in the submission section renders "Link pending" on the live page.
The recording has to be made on a real device or simulator. There IS a web target
(`react-native-web` is installed, and `npm run screenshots` exports it), but the
map renders as a device-only stand-in on web (`src/core/maps/react-native-maps.web.tsx`),
so a headless capture would show a flow with no map in it. Record on a device,
host it, replace the placeholder.

### Time log figures need a human check
**Priority:** P2
**Files:** `docs/TIME_LOG.md`, `landing/index.html`
Session two and three totals are bounded by commit spans. Session one landed as a
single initial commit, so its 7 h 45 m is an estimate with nothing to check it
against. Confirm or correct before the assessor reads it.

## Tooling

### `npm run lint` does not run
**Priority:** P1
**Files:** `eslint.config.js`, `package.json`
`eslint.config.js` is flat config but neither `eslint` nor `eslint-config-expo` is
a declared dependency, so `npx expo lint` fails with "requires ESLint version
8.57.0 or greater". Either install the pair and make lint pass, or delete the
config. Shipping a lint script that errors is worse than having none.

## Manual QA — first run

### Verify the permission timing fix on a device
**Priority:** P1
**Files:** `app/onboarding.tsx`, `src/features/location/useDeviceLocation.ts`, `src/core/onboarding/onboardingGate.ts`
The fix is reasoned, not observed — there is no simulator in the build
environment. Check on real hardware:
- The OS dialog does NOT appear over the step 0 welcome screen on a genuine first
  launch, and DOES appear on pressing "Use my location".
- Whether the onboarding gate resolves before the Conditions tab's first paint on
  real AsyncStorage, cold start.
- The denied path: after Deny, the banner is legible in all themes, Continue
  advances, and Conditions shows "Location is off" rather than a spinner.
- iOS when permission was already denied at OS level: the request returns with no
  dialog, so the primer jumps straight to the denied banner. Correct, but it may
  read as unresponsive.
- `useDeviceLocation`'s initial status changed from `idle` to `requesting` for
  auto callers. Confirm the map and capture screens still show the right loading
  state.

### Verify the legend marker anchor
**Priority:** P2
**Files:** `app/(tabs)/map.tsx`
The 44px hit area sets an explicit centre anchor because the marker default is
bottom centre. Confirm the diamond sits on its coordinate and in register with
the community rings.

## Performance

### Markers are unbounded
**Priority:** P3
**Files:** `app/(tabs)/map.tsx`
Every stored and community report mounts a native marker with no viewport culling
or clustering, on top of 22 always mounted legend pins. A chaser with a few
hundred logged reports mounts a few hundred marker views at once.

## Data

### A missing hourly temperature becomes 0
**Priority:** P3
**Files:** `src/features/weather/model/mappers.ts`, `src/features/weather/components/ForecastStrip.tsx`
`mappers.ts` substitutes `0` for a null temperature, which is finite, so the chart
cannot filter it. A 24–31 °C day with one null hour collapses the curve into the
top of the chart with a spike to the floor. Make `HourlyPoint.temperatureC`
nullable and let the chart's existing non-finite handling do its job.

## Charts

### `ScaleOptions.min`/`max` are dead in production
**Priority:** P4
**Files:** `src/core/charts/geometry.ts`
The forced domain branch is now exercised only by tests — the Sparkline
passthrough that used it was removed as dead config. Either delete it or note why
it stays.

## Completed

### Storm legends, community reports, chart layer, brand identity
**Completed:** v1.2.0 (2026-09-18)

### WCAG flash and contrast failures on the landing page
**Completed:** v1.2.0 (2026-09-18)

### Unreachable onboarding call to action on the map
**Completed:** v1.2.0 (2026-09-18)

### Per screen GPS re-acquisition on the legend detail route
**Completed:** v1.2.0 (2026-09-18)
