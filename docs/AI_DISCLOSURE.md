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

## Photo import

Added after the main build, with Claude Code, once it was clear that a field log
demonstrated only on camera shots is hard to show without waiting for weather.

**Directed by me**

- That the camera stays the primary action and import sits beside it, rather than
  the two being offered as equals — the brief asks for camera capture, and a
  chaser's default is still the shutter
- That an imported report must be marked as imported, because its coordinates and
  conditions belong to the import and not to the storm; the alternative was a log
  whose entries cannot be told apart
- That EXIF is preferred over the import clock, and that an unparseable EXIF date
  falls back honestly instead of being guessed at
- That the two paths converge at the metadata phase rather than forking the flow

**Generated with Claude assistance, then reviewed**

| Area | Notes |
|---|---|
| `photoPicker.ts` | Picker wrapper and the EXIF date resolution, drafted to the rules above. |
| `photoPicker.test.ts` | Cases chosen by me (EXIF precedence order, the `0000:00:00` blank some cameras write, month 13, non-finite creation time); assertions drafted with Claude. |
| Capture screen and metadata form changes | Drafted with Claude, reviewed against the existing phase machine. |
| Schema version 2 migration | Drafted with Claude; the decision to bump the version rather than make the field optional was mine. |

The EXIF tests assert against locally constructed dates rather than ISO literals,
so they hold under `npm run test:tz` as well as the default UTC run. An unrelated
type error in `eraseAccount.test.ts`, which predated this change and broke
`npm run typecheck`, was fixed in the same pass.

## Storm lore, photography and polish

A later pass added photographs and expanded writing to the storm legends, worldwide
demo data, per-type classification help, a starfield for the dark themes and
per-report card stocks for Field Card, and fixed four defects found on device.

**Directed by me**

- That legend photography had to be verifiably licensed before it was bundled,
  and that an image whose subject does not match its legend must say so in the
  product rather than only in a credits file
- That a legend with no acceptable image keeps its icon, rather than the bar
  being lowered until every entry had a picture
- That classification help belongs on the form at the moment of choosing, not
  behind a second tap
- That the card stocks and the starfield are theme tokens, so no component
  decides anything by testing a theme name

**Generated with Claude assistance, then reviewed**

| Area | Notes |
|---|---|
| Image sourcing scripts | Queried the Wikimedia Commons API, read each licence from `extmetadata` and rejected anything outside public domain, CC0, CC BY and CC BY-SA before downloading. The scripts are tooling and are not part of the app. |
| Legend prose and figures | Drafted with Claude to my brief, then checked against the records they cite. |
| `Starfield`, `cardTint`, `bleedFor` | Drafted with Claude; the seeded generator and the id hash were specified by me so that neither the sky nor a card's colour can change between renders. |
| Documentation and this submission | Drafted with Claude from my notes and edited by me. |

**A correction worth naming from this pass**

Commons keyword search returned a butterfly for Mawsynram and a hospital group
photo for Kampala, and the first script kept both because their licences were
clean. Licence checking is not subject checking. A title-relevance filter was
added and every remaining image was reviewed by hand; one that still matched only
on the word "Lightning" inside a ranch name was dropped outright.

The same pass also produced a test asserting that the severity rail clears 3:1
against every card stock. It does not, on white, and it does not need to: the
tier is carried by a text label as well as by the rail. This is the second time
that exact assertion has been proposed and the second time it was removed rather
than the palette being bent to satisfy it.

## Verification

Generated code was not taken on trust. The domain, data and theme layers are
covered by 509 unit tests run under strict TypeScript, the app was exercised on a device for
every flow in the brief, and I corrected the model's output where it was wrong.
Two examples worth naming, since a disclosure that claims the AI got everything
right is not a useful disclosure:

1. The first cut of `formatTemperature` returned `-0°` for readings between -0.5
   and 0. Caught by a unit test, fixed with an explicit normalisation.
2. The first version of the repository exposed `markSyncState` calling `this.update`
   on an object literal, which breaks the moment the repository is destructured.
   Rewritten to close over an extracted function.
