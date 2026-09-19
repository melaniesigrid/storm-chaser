# Changelog

All notable changes to this project are documented here. Dates are YYYY-MM-DD.

## [1.3.0] — 2026-09-19

### Added

- **Volt lies on the conditions card and answers questions.** The mascot now
  perches on the empty top-right shoulder of the first weather card, tipped
  back at an angle and swaying, and a tap gets a fact about the sky outside —
  thunderstorm facts during a thunderstorm, snow facts in snow — in a speech
  bubble that springs out of the corner he is sitting on. Facts rotate rather
  than draw at random, so two taps never repeat. Tap anywhere else, or wait
  nine seconds, and he goes back to lounging. Nothing in the card moves to make
  room for him, and Reduce Motion drops the sway, the wobble and the spring
  while keeping the fact.
- **Storm legends carry photographs and the long version.** Each of the 22
  entries now has an image, two paragraphs on the mechanism and the consequence,
  and a block of checkable figures. Images came from Wikimedia Commons with the
  licence read from the API rather than assumed — public domain, CC0, CC BY and
  CC BY-SA only — and each is credited in the app and in `docs/IMAGE_CREDITS.md`.
  Where no freely licensed photograph of a specific storm exists, the image
  illustrates the phenomenon and the caption underneath says what it really
  shows. One legend found nothing acceptable and keeps its icon.
- **Classifications explain themselves.** Selecting a storm type shows one
  sentence on how to recognise it from the ground, on the capture form and on
  the saved report.
- **39 community demo storms instead of 6.** Six still generate around the
  viewer so the map is populated wherever you stand; 33 more sit at fixed
  coordinates on every inhabited continent, so zooming out is worth doing.
- **Stars in the dark themes.** A seeded, static field between the gradient and
  the content, denser and brighter towards the top where the sky is darkest.
  Draws nothing in the daylight themes.
- **Field Card prints every card on its own stock.** Twelve tints of hues the
  theme already owns, chosen by a hash of a stable name so a card keeps its
  colour for life — a report's id in the field log, a `tone` for the fixed
  panels on Conditions, capture and the profile. Every tint carries the theme's
  ink at AA, which is asserted, and the recesses inside a card (a meter track,
  an instrument well) are now mixed against the stock they sit on rather than
  against a white the card no longer is. A test pins the six tones of the
  Conditions column to six different stocks.

- **A sky that is a sky.** Skyward Day ran an all-gold gradient, which was
  chosen for contrast headroom: a blue zenith is the darkest thing the theme
  can put behind body copy. The headroom is bought differently now —
  `textMuted` darkened by about 0.9 of a contrast point — which pays for four
  stops running blue, through a desaturated haze band, into low warm light at
  the horizon. Ink reads at 6.2:1 and captions at 4.7:1 on the darkest stop,
  both with more margin than the gold had. The header takes the first stop and
  the tab bar the last, so the chrome is part of the sky instead of two flat
  bars laid over it.
- **Field Card prints on stock, not on tinted white.** The twelve tints sat
  between 0.75 and 1.0 relative luminance — close enough to paper that on a
  phone in daylight the column still read as white with a cast on it. They now
  sit between 0.54 and 0.78, and plain white is gone from the palette, because
  a palette whose first entry is the surface colour will always have one card
  that looks like the tint failed to apply.

### Fixed

- **Field Card's tier text was under AA on eleven of its twelve stocks.** The
  `tierText` set was tuned against `surface` and never re-checked against the
  stocks a card is actually printed on; `unsettled` was reading at 3.8:1. The
  whole set is darkened to clear 4.5:1 against the darkest stock in the
  palette, and the theme test now checks everything that can be drawn as text
  on a stock — body, captions and all five tier colours — rather than body
  alone, which is why the gap survived the first palette.
- **`npm run lint` and `npm run typecheck` both run again.** `tsc` was exiting
  on a deprecated `baseUrl` before it checked a line, and could no longer find
  Jest's globals; the flat ESLint config was crawling the repo checkouts under
  `.claude/worktrees` and parsing the ES-module capture scripts as CommonJS.
  Both commands are now clean, as is `jest`, whose duplicate-manual-mock
  warning came from the same worktrees.

- **The back button said `(tabs)`.** iOS labels a back button with the previous
  screen's title, and the tab group's header is hidden, so its title fell back
  to the route name. Titled the group and pinned a default back label, which
  fixes every pushed screen at once rather than one route at a time.
- **Text clipped at both ends.** `score` set a 56px face in a 54px line box, and
  the display faces paint outside the box React Native measures for them. Line
  heights are now asserted never to fall below their font size, and the large
  variants carry a self-cancelling bleed so the drawing box widens without the
  layout moving.
- **Hiding storm lore did nothing on iOS.** The marker layer was unmounted
  behind a condition; unmounting a fragment-returning child of `MapView` leaves
  its annotations on the map. It is now always mounted and its list varies
  instead, which goes through the marker diff both platforms handle.
- **`npm run typecheck` failed** on a pre-existing type error in
  `eraseAccount.test.ts`, unrelated to any of the above.

- **A storm photo can be imported, not only shot.** The capture flow keeps the
  shutter as its primary action and adds an import path beside it, which joins
  the camera path at the metadata phase so classification, notes, storage and
  failure handling stay one implementation. The metadata phase is now checked
  before the camera permission gate, so a device that has refused the camera —
  or has none — can still file a report. Imported photos take their capture time
  from EXIF (`DateTimeOriginal`, then `DateTimeDigitized`, then `DateTime`, then
  the asset creation time, then the clock), read as local time and discarded
  outright when it does not parse, because a wrong timestamp is worse than an
  honest fallback.
- **Reports record where the photo came from.** `photoSource` distinguishes a
  camera shot from an import, because an imported photo carries the position and
  conditions of the import rather than of the storm. The metadata form says so
  before saving and the detail view keeps it in the record panel. This moved the
  storage envelope to version 2 and gave the migration hook its first real job:
  version 1 predates import, so its reports are marked camera shot on read.

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
