# Brand assets

Source SVGs for the app icon, the Android adaptive foreground and the splash mark.

They are geometry, not exports: the bolt is the same polygon `src/core/brand/Monogram.tsx`
draws, and the gradient is `skyward-day`'s `brand.ray` from `src/core/theme/themes.ts`.
If either changes, change these to match. Nothing enforces it.

The `sc` letters that ride the bolt inside the app are dropped here. At 48px on a home
screen they collide with the bolt's own crossbar, and the mark is more recognisable as one
silhouette than as a monogram nobody can resolve.

`Monogram.tsx` now applies the same rule to itself: under `LETTER_FLOOR` (80px) it draws
bolt and plate only, so the 26px mark in a tab header and these exports agree without
anyone having to remember. Change the floor there and these files stay as they are; they
are already below it at every size they ship at.

## Not yet wired into `app.json`

Expo needs PNG for `icon`, `android.adaptiveIcon.foregroundImage` and `splash.image`, and
rasterising an SVG needs a tool this repo does not depend on. Pointing `app.json` at files
that do not exist breaks `expo prebuild`, so the keys are deliberately absent rather than
present and dangling.

To wire them up:

```sh
npm i -D sharp-cli
npx sharp -i assets/brand/icon.svg                      -o assets/icon.png                    resize 1024 1024
npx sharp -i assets/brand/adaptive-icon-foreground.svg  -o assets/adaptive-icon.png           resize 1024 1024
npx sharp -i assets/brand/splash-icon.svg               -o assets/splash-icon.png             resize 512 512
```

Then add to the `expo` block in `app.json`:

```json
"icon": "./assets/icon.png",
"splash": {
  "image": "./assets/splash-icon.png",
  "resizeMode": "contain",
  "backgroundColor": "#6E9AD4"
},
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#14213A"
  }
}
```

`#6E9AD4` is `skyward-day`'s gradient top stop, so the launch image and the first frame of
the app agree on the colour of the sky. `#14213A` is the monogram plate.
