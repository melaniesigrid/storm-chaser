/**
 * Renders docs/assessment-cover.html to docs/Storm-Chaser-Assessment-Cover.pdf.
 *
 *   node scripts/render-assessment-cover.mjs
 *
 * The HTML is the source of truth; the PDF is a build artifact. Editing the
 * PDF directly is how the cover drifted off-brand in the first place.
 *
 * `printBackground` is not optional here: Field Card is a theme made of flat
 * fills, hard offset shadows and one amber band, all of which Chromium treats
 * as background and drops by default. Without it the cover prints as black
 * text on white, which is precisely the generic look this replaces.
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'docs/assessment-cover.html');
const out = resolve(root, 'docs/Storm-Chaser-Assessment-Cover.pdf');

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });

// Archivo Black and IBM Plex Mono come from Google Fonts. Printing before they
// land silently falls back to the system sans, and the difference is the whole
// point of the page.
await page.evaluate(() => document.fonts.ready);

await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });

/*
 * The cover is one page by definition, and a second page of it is always a
 * mistake -- it means the sheet grew past A4 and Chromium quietly carried the
 * overflow rather than failing. The rest of the document is free to run as
 * long as it needs, so only the cover is measured.
 *
 * The 2px slack is subpixel rounding, not headroom: the cover carries a
 * `min-height` of the printable box, so at rest it measures that height to
 * within a fraction of a pixel and a strict comparison fails on a cover that
 * fits.
 */
const overflow = await page.evaluate(() => {
  const cover = document.querySelector('.cover');
  const printable = (297 - 28) * (96 / 25.4);
  return Math.max(0, Math.round(cover.getBoundingClientRect().height - printable - 2));
});

const pages = await page.evaluate(() => document.querySelectorAll('.chapter').length);

await browser.close();

if (overflow > 0) {
  console.error(`Cover overflows its page by ${overflow}px. Tighten the .cover in docs/assessment-cover.html.`);
  process.exit(1);
}

console.log(`Wrote ${out} (cover + ${pages} sections)`);
