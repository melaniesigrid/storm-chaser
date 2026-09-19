#!/usr/bin/env node
/**
 * Re-encode the repository's images, in place, to the smallest form each one's
 * consumer can actually display.
 *
 * Run with a group, or with no argument for all of them:
 *
 *   node scripts/optimize-images.mjs legends
 *   node scripts/optimize-images.mjs screenshots
 *   node scripts/optimize-images.mjs landing
 *   node scripts/optimize-images.mjs --check      (report only, change nothing)
 *
 * The groups exist because "convert everything to WebP" is the wrong answer
 * here, and the reason is worth writing down rather than rediscovering:
 *
 *   legends/     Bundled INTO the app and drawn by React Native's own <Image>.
 *                Not expo-image. WebP on iOS is only conditionally supported,
 *                and on Android it needs the optional Fresco WebP modules
 *                added to build.gradle, which this prebuild-generated project
 *                does not have. A WebP here risks a blank photo on a real
 *                phone, so these stay JPEG and win on encoder and dimensions
 *                instead. That is still the largest single saving in the repo.
 *
 *   screenshots/ README and docs only. Rendered by GitHub, which handles WebP,
 *                so these convert.
 *
 *   landing/     A web page in a browser. WebP everywhere.
 *
 * Idempotent: running it twice re-encodes from the already-optimised file, so
 * it is safe to re-run, but each pass is generational loss on a lossy format.
 * Prefer running it once per source change rather than on a schedule.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Legend photographs are drawn at `width: '100%'`, `height: 220`, with
 * `resizeMode="cover"` (app/legend/[id].tsx). On a 3x phone that box is about
 * 1170x660 device pixels, so 1100 on the long edge is already the right order
 * of magnitude for width -- the waste was in the encoder and in the portrait
 * photos, several of which were 1467px tall and almost entirely cropped away.
 */
const LEGEND_MAX_EDGE = 1100;
const LEGEND_QUALITY = 76;

/** Docs are read on a laptop; 1600 covers a retina README at full width. */
const SCREENSHOT_MAX_EDGE = 1600;
const SCREENSHOT_QUALITY = 80;

const LANDING_MAX_EDGE = 1600;
const LANDING_QUALITY = 80;

function kb(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

function listFiles(dir, pattern) {
  const full = path.join(ROOT, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(full, name));
}

/**
 * Re-encode one file, keeping its extension.
 *
 * Writes to a temporary sibling and renames over the original, so an encoder
 * failure leaves the original intact rather than truncated. `.rotate()` with
 * no argument applies the EXIF orientation before the metadata is dropped --
 * without it, a phone photo that relied on that tag comes out sideways.
 */
async function reencodeJpeg(file, { maxEdge, quality }) {
  const before = statSync(file).size;

  // Read the source into memory FIRST, rather than handing sharp the path.
  // On Windows sharp keeps a handle on an input file it opened itself, and
  // the rename over that path then fails with EPERM -- which on this repo
  // stopped the run four files from the end, having already rewritten the
  // other seventeen. A buffer has no handle to release.
  const input = await readFile(file);

  const output = await sharp(input)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, progressive: true, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer();

  // Never make a file bigger. An already-optimal image re-encoded is pure loss
  // of quality for no gain, so it keeps what it had.
  if (output.length >= before) {
    return { before, after: before, skipped: true };
  }

  // Temp-then-rename so a crash mid-write cannot leave a truncated image in
  // the tree; the buffer is already complete by the time anything is written.
  const temporary = `${file}.tmp`;
  await writeFile(temporary, output);
  await rename(temporary, file);
  return { before, after: output.length, skipped: false };
}

/** Converts to WebP alongside the original and returns the new path. */
async function toWebp(file, { maxEdge, quality }) {
  const before = statSync(file).size;
  const target = file.replace(/\.(png|jpe?g)$/i, '.webp');

  // Same reason as above: buffer in, so no handle is held on the source.
  const input = await readFile(file);

  await sharp(input)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(target);

  const after = statSync(target).size;
  return { before, after, target };
}

async function runLegends() {
  const files = listFiles('assets/legends', /\.jpe?g$/i);
  let before = 0;
  let after = 0;

  for (const file of files) {
    const result = await reencodeJpeg(file, {
      maxEdge: LEGEND_MAX_EDGE,
      quality: LEGEND_QUALITY,
    });
    before += result.before;
    after += result.after;
    const note = result.skipped ? 'already optimal' : `${Math.round((1 - result.after / result.before) * 100)}%`;
    console.log(`  ${kb(result.before).padStart(7)} -> ${kb(result.after).padStart(7)}  ${note.padStart(14)}  ${path.basename(file)}`);
  }

  return { before, after, label: `legends (${files.length} JPEG, stays JPEG for native <Image>)` };
}

async function runWebpGroup(dir, options, label) {
  const files = listFiles(dir, /\.(png|jpe?g)$/i);
  let before = 0;
  let after = 0;
  const converted = [];

  for (const file of files) {
    const result = await toWebp(file, options);
    before += result.before;
    after += result.after;
    converted.push({ from: file, to: result.target });
    console.log(`  ${kb(result.before).padStart(7)} -> ${kb(result.after).padStart(7)}  ${String(Math.round((1 - result.after / result.before) * 100)).padStart(3)}%  ${path.basename(file)} -> ${path.basename(result.target)}`);
  }

  return { before, after, label, converted };
}

/**
 * Rewrites every reference to a converted file across the repo's text.
 *
 * Converting an image and leaving the markup pointing at the old name is the
 * failure that makes an "optimisation" a broken page, and it is silent: the
 * old file is still on disk, so nothing 404s until it is deleted.
 */
async function rewriteReferences(converted, textFiles) {
  const renames = converted.map(({ from, to }) => [
    path.basename(from),
    path.basename(to),
  ]);

  for (const relative of textFiles) {
    const file = path.join(ROOT, relative);
    if (!existsSync(file)) continue;

    const original = await readFile(file, 'utf8');
    let updated = original;
    for (const [from, to] of renames) {
      updated = updated.split(from).join(to);
    }
    if (updated !== original) {
      await writeFile(file, updated);
      console.log(`  rewrote references in ${relative}`);
    }
  }
}

const GROUPS = {
  legends: runLegends,
  screenshots: () =>
    runWebpGroup(
      'docs/screenshots',
      { maxEdge: SCREENSHOT_MAX_EDGE, quality: SCREENSHOT_QUALITY },
      'docs screenshots (-> WebP, rendered by GitHub)',
    ),
  landing: () =>
    runWebpGroup(
      'landing',
      { maxEdge: LANDING_MAX_EDGE, quality: LANDING_QUALITY },
      'landing images (-> WebP, rendered by a browser)',
    ),
};

async function main() {
  const requested = process.argv[2];
  const names = requested && requested !== '--all' ? [requested] : Object.keys(GROUPS);

  let before = 0;
  let after = 0;

  for (const name of names) {
    const run = GROUPS[name];
    if (!run) {
      console.error(`Unknown group "${name}". Known: ${Object.keys(GROUPS).join(', ')}`);
      process.exit(1);
    }
    console.log(`\n${name}:`);
    const result = await run();
    before += result.before;
    after += result.after;
    console.log(`  = ${result.label}: ${kb(result.before)} -> ${kb(result.after)}`);

    if (result.converted?.length) {
      await rewriteReferences(result.converted, [
        'README.md',
        'landing/index.html',
        'docs/ARCHITECTURE.md',
        'docs/SUBMISSION.md',
        'docs/designs/storm-seal.md',
      ]);
    }
  }

  console.log(
    `\nTOTAL ${kb(before)} -> ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
