/**
 * Screenshots of the real app, at phone size, straight from the source.
 *
 *   npm run screenshots
 *
 * Every run re-exports the app with `expo export --platform web`, so the
 * images in docs/screenshots always reflect the current code. There is no
 * separate mockup to keep in sync: this is the same `app/` and `src/` the
 * device builds use, rendered through react-native-web.
 *
 * One caveat: `react-native-maps` is native only. It calls
 * `codegenNativeComponent`, which has no web implementation, so on web the map
 * surface itself resolves to a stand-in (see metro.maps-web.js). The Map tab
 * renders rather than throwing, but its pins are a device run only. Everything
 * else is the genuine screen.
 *
 * Weather is live. The Chase Index in the capture is whatever the atmosphere
 * over CAPTURE_LAT/CAPTURE_LON is doing at the moment you run it, which is the
 * honest thing for a README to show.
 *
 * Environment:
 *   CAPTURE_LAT, CAPTURE_LON   position to capture from (default Toronto)
 *   CAPTURE_KEEP_EXPORT=1      keep the web bundle for debugging
 *
 * Requires Playwright, which is a devDependency here:
 *   npx playwright install chromium
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.CAPTURE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'docs/screenshots');
const exportDir = resolve(root, '.expo/web-capture');
const PORT = Number(process.env.CAPTURE_PORT ?? 4319);

const GEO = {
  latitude: Number(process.env.CAPTURE_LAT ?? 43.6532),
  longitude: Number(process.env.CAPTURE_LON ?? -79.3832),
};

/**
 * One viewport. Storm Chaser is a phone app -- it ships as an APK, its layout
 * is a single column and its tab bar is at the bottom -- so a 1440px capture
 * of it was only ever the same screen with more empty margin either side.
 */
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
};

/**
 * `onboarded: false` leaves storage empty so the welcome flow runs, which is
 * the only way to capture it: the app writes the flag the moment it finishes.
 */
const SHOTS = [
  { name: 'app-conditions', path: '/', viewports: ['mobile'], settle: 7000 },
  /*
   * The same screen on Field Card, which is the one theme that prints each
   * card on its own stock. Two captures of Conditions is not a duplicate: it
   * is the only way a still shows that the themes are whole designs rather
   * than a palette swap.
   */
  {
    name: 'app-conditions-field-card',
    path: '/',
    viewports: ['mobile'],
    settle: 7000,
    theme: 'field-card',
  },
  { name: 'app-log', path: '/log', viewports: ['mobile'], settle: 5000 },
  { name: 'app-settings', path: '/settings', viewports: ['mobile'], settle: 5000 },
  { name: 'app-onboarding', path: '/', viewports: ['mobile'], settle: 4000, onboarded: false },
];

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
};

function exportWeb() {
  console.log('› exporting the app for web (this is the current source, not a mockup)');
  rmSync(exportDir, { recursive: true, force: true });
  execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', exportDir], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
    // Windows resolves npx through npx.cmd, which needs a shell to spawn.
    shell: process.platform === 'win32',
  });
}

/**
 * Single page output: unknown paths fall through to index.html so the router
 * can take them.
 *
 * Two containment rules, because this serves a real directory off a real port
 * while the capture runs. `join` resolves `..` segments, so without the prefix
 * check `GET /../../../.ssh/id_rsa` reads straight out of the export root; and
 * binding to loopback keeps the port off every other interface on the network.
 */
function serve(dir) {
  const rootDir = resolve(dir);
  const server = createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const index = join(rootDir, 'index.html');
    let file = resolve(rootDir, `.${url}`);
    if (file !== rootDir && !file.startsWith(rootDir + sep)) file = index;
    if (!existsSync(file) || statSync(file).isDirectory()) file = index;
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((done) => server.listen(PORT, '127.0.0.1', () => done(server)));
}

/** Shrinks the 2x captures to a size a README can load. Skipped if sharp is absent. */
async function optimise(files) {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.log('› sharp not installed, leaving captures at full size');
    return;
  }
  for (const file of files) {
    const before = statSync(file).size;
    const tmp = `${file}.tmp`;
    const image = sharp(file);
    const { width } = await image.metadata();
    await image
      .resize({ width: Math.round(width * 0.66) })
      .png({ palette: true, quality: 88, effort: 9 })
      .toFile(tmp);
    rmSync(file);
    const { renameSync } = await import('node:fs');
    renameSync(tmp, file);
    console.log(`  ${file.split(/[\\/]/).pop()}  ${(before / 1024) | 0}KB → ${(statSync(file).size / 1024) | 0}KB`);
  }
}

exportWeb();
mkdirSync(outDir, { recursive: true });
const server = await serve(exportDir);
const browser = await chromium.launch();
const written = [];

for (const shot of SHOTS) {
  for (const key of shot.viewports) {
    const context = await browser.newContext({
      viewport: VIEWPORTS[key],
      deviceScaleFactor: 2,
      permissions: ['geolocation'],
      geolocation: GEO,
      locale: 'en-CA',
      colorScheme: 'light',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    if (shot.onboarded !== false) {
      // Skip the welcome flow for every screen but the one that is the flow.
      await page.addInitScript(() => localStorage.setItem('storm-chaser.onboarding.v1', 'done'));
    }

    if (shot.theme) {
      // Same key the Appearance screen writes, so this is the app's own
      // preference rather than a capture-only override.
      await page.addInitScript(
        (name) => localStorage.setItem('storm-chaser.theme.v1', name),
        shot.theme,
      );
    }

    await page.goto(`http://localhost:${PORT}${shot.path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(shot.settle);

    const file = resolve(outDir, `${shot.name}-${key}.png`);
    await page.screenshot({ path: file });
    written.push(file);
    console.log(`› ${shot.name}-${key}.png`);
    await context.close();
  }
}

await browser.close();
server.close();
await optimise(written);
if (!process.env.CAPTURE_KEEP_EXPORT) rmSync(exportDir, { recursive: true, force: true });
console.log(`\ndone, ${written.length} captures in docs/screenshots`);
