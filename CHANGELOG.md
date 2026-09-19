# Changelog

All notable changes to this project are documented here. Dates are YYYY-MM-DD.

## [Unreleased]

### Added

- **Delete my account.** Profile now ends in an Account panel whose one button
  erases the chaser from the phone: call sign, every report, every photograph,
  the theme preference, the onboarding flag and both copies of the query cache.
  There is no server account to close, so `eraseAccount` composes all six in one
  place and runs every step even after one fails — a half-erased device reported
  as clean is the worst outcome available. Confirmed behind a destructive alert
  that says it cannot be undone, and it lands back on onboarding.

- **The mark strikes on every launch.** An overlay paints the SC monogram on the
  active theme's own gradient, drops the bolt through it once, and leaves. It
  plays every launch rather than only the first, which is affordable only
  because the whole thing is capped: `LAUNCH_CEILING_MS` is 1200ms, the app
  mounts and fetches underneath it, and a tap skips it. The ground is the same
  four stops `Screen` paints, so the exit fades the mark out of a sky that does
  not change.
- **The mark now appears inside the app, not just at the door.** It strikes at
  26px in every tab header on each tab change, and pulses at 28px in the
  conditions loading state — the one place it is allowed to loop, because there
  it is standing in for a spinner rather than decorating a wait.
- **The choreography is data.** `launchSequence.ts` holds the timing as pure
  numbers with a test suite on it, so each theme strikes the way it already
  moves: Skyward eases, Field Card stamps, Broadcast cuts with no approach and
  no exit. Reduced motion collapses every theme to the same still mark and a
  cross-fade.

### Changed

- **`Monogram` takes `motion` instead of `animated`.** Three named modes
  (`none`, `strike`, `pulse`) rather than a boolean, and the strike timing now
  comes from the theme rather than being hardcoded in the component.
- **The monogram drops its letters below 80px.** The rule
  `assets/brand/README.md` already stated for the exported icon now lives in the
  component too: under `LETTER_FLOOR` the `sc` collides with the bolt's own
  crossbar, so small marks draw one silhouette instead.

### Fixed

- **Broadcast stopped clipping its own letters.** The type scale tightens
  display sizes for Bricolage and Big Shoulders; Anton is condensed already, and
  the extra negative tracking pushed glyphs past the box the platform measured,
  shaving the ends off headings. Tracking is now a theme token
  (`type.displayTracking`) that Broadcast sets to 0, so the fix is one value in
  the token layer rather than a font check in every headline, and a test holds
  every theme inside the scale it multiplies.

- **The Map tab no longer white-screens on web.** `react-native-maps` is native
  only: its layer specs call `codegenNativeComponent`, which `react-native-web`
  does not export, so the import threw while the module was still evaluating and
  took the whole screen down. Metro now aliases the package to a stand-in for
  `platform === 'web'`, which draws a "the map runs on device" surface. The
  legend, the counts, the lore toggle and the "Document a storm" call to action
  all keep working in the browser. iOS and Android are untouched.

## [1.2.0] — 2026-09-18

### Added

- **Storm legends.** 22 famous storm locations plotted as a third pin shape on
  the map, each with a detail route at `/legend/[id]`, a great circle distance
  from the viewer, and a legend of the day surfaced on Conditions through a new
  lore card.
- **Community reports.** A sample community layer on the map with its own pin
  shape, showing distance and recency from other chasers.
- **Chart layer.** `Sparkline` and `RangeBar` primitives over one set of shared
  scaling geometry, wired into the forecast strip and the seven day outlook so
  the next twelve hours and the week read as shapes rather than columns of
  figures.
- **Brand identity.** Wordmark, monogram and the exported icon set.
- **Shared position store.** A last known position is published once and read by
  any screen that needs it, replacing per screen GPS acquisition.
- **Exhaustiveness guard.** `assertNever` keeps a switch over a string union a
  compile error when the union grows, while still returning a runtime fallback
  for a value persisted under an older schema.

### Fixed

- **WCAG 2.3.1 on the landing page.** The hero lightning fired four luminance
  peaks inside 660 ms and looped forever, over the general flash threshold. It
  now fires three, with a 5.4 s dark interval between cycles.
- **Contrast.** The landing page eyebrow rendered at 3.18:1 in the day theme,
  under the 4.5:1 AA floor for text below 18.66px. All three themes now clear it.
- **First run permission timing.** The OS location dialog appeared over the
  welcome screen before the copy explaining it, which left both primer buttons
  decorative. Acquisition is now gated on onboarding completion and driven by
  the button press.
- **Unreachable onboarding call to action.** The map's empty state was gated on
  community reports, which are seeded and never empty, so a first run user never
  saw "Document a storm". It is now gated on the chaser's own reports.
- **Touch target.** Storm legend pins presented an 18px hit area; they now clear
  the 44px minimum the rest of the app holds to, anchored so the visual stays on
  its coordinate.
- **Keyboard focus.** The landing page had no `:focus-visible` rule, leaving a
  browser default ring unreadable against the night theme.
- **Heading hierarchy.** The landing page had no `h1`.
- **Chart robustness.** `scaleSeries` no longer emits `NaN` for a non-finite
  reading, and the forecast sparkline keeps every point aligned with the hour it
  describes.

### Changed

- Type scale: chart readings route through a new `figure` variant instead of
  inline pixel sizes.
- One `clamp` for the whole app, replacing three independent copies.
- Marker and chart layers are memoised, so toggling the lore chip repaints only
  the lore layer.
- Time log revised down and extended with session three.

## [1.1.0] — 2026-09-18

### Added

- Three named themes behind one token contract, with the display face as a theme
  token and a five tier chase ladder.
- Onboarding flow, theme picker, confetti with haptics, and Volt.
- Meteocons icon set replacing text glyphs.
- Static landing page, deployed to Vercel.

### Fixed

- An offline banner rendering at 1.22:1 in light mode.
- A muted token at 2.0:1 in dark mode.
- A 26px touch target on the storm classification control.

## [1.0.0] — 2026-09-18

Initial build: weather domain over Open-Meteo, the Chase Index, the two phase
storm capture flow, persistence behind an injected store port, the field log and
detail screens, the map, offline support and the first test suite.
