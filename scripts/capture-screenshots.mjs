/**
 * Regenerates docs/screenshots/* from the showcase site in landing/.
 *
 * Requires Playwright and a Chromium download:
 *   npm i -D playwright && npx playwright install chromium
 *   node scripts/capture-screenshots.mjs
 *
 * The three viewports match the README layout: desktop is the hero image,
 * tablet and mobile sit in the two column table beneath it.
 *
 * Captures come out at device scale factor 2. The committed files were then
 * resized to 66% and palette-quantised (sharp, png { palette: true }), which
 * takes ~4.3MB down to ~780KB with no visible loss at README widths.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const root = process.env.CAPTURE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = process.env.CAPTURE_URL ?? pathToFileURL(resolve(root, 'landing/index.html')).href;
const outDir = resolve(root, 'docs/screenshots');

const VIEWPORTS = [
  { name: 'desktop-landing', width: 1440, height: 900 },
  { name: 'tablet-landing', width: 820, height: 1180 },
  { name: 'mobile-landing', width: 390, height: 844 },
];

// The hero alone, at each viewport, so the README images are not 6000px tall.
const HERO_ONLY = true;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  // Hide scrollbars so the captures have no chrome of their own.
  await page.addStyleTag({ content: '::-webkit-scrollbar { display: none; }' }).catch(() => {});
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  // Playwright only encodes PNG or JPEG, so the shot comes back as a buffer
  // and sharp writes the WebP the README actually references. A PNG here
  // would land beside the .webp and be silently ignored by every doc.
  const shot = await page.screenshot({ fullPage: !HERO_ONLY });
  await sharp(shot).webp({ quality: 80, effort: 6 }).toFile(resolve(outDir, `${vp.name}.webp`));
  console.log(`wrote ${vp.name}.webp`);
  await context.close();
}

// Two sections on their own. #themes is the closest thing to an app screenshot
// that can be produced without a device, since the three mockups use the real
// tokens; #design is the proposal boards the README's Design process describes.
for (const id of ['themes', 'design']) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(target, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const section = await page.locator(`#${id}`).screenshot();
  await sharp(section).webp({ quality: 80, effort: 6 }).toFile(resolve(outDir, `${id}.webp`));
  console.log(`wrote ${id}.webp`);
  await context.close();
}

await browser.close();
