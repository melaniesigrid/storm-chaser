/**
 * THROWAWAY SPIKE — step 1 of docs/designs/storm-seal.md. Delete before merge.
 *
 * Three questions can each invalidate the seal architecture, and all three are
 * cheap now and expensive at step 4. This screen answers them with numbers on
 * a real device rather than with reasoning:
 *
 *   Q1  Does an offscreen <Svg> mounted at full size, rasterised with
 *       toDataURL(cb) and NO size options, produce a correctly composed image
 *       of the right dimensions on both platforms?
 *
 *       Known from the native source: toDataURL(cb, {width, height}) is NOT
 *       portable. Android (SvgView.java:365) allocates at the requested size,
 *       but iOS (RNSVGSvgView.mm:331) has drawRect: pass [self bounds] rather
 *       than the rect it was handed, so content draws at the MOUNTED size in
 *       the corner of a larger canvas. Both variants run here so the
 *       difference is visible rather than taken on trust.
 *
 *   Q2  Does <Image href={{uri: 'file://…document directory…'}}/> inside an
 *       <Svg> actually draw the photograph on both platforms? Historically
 *       flaky with document-directory URIs, and every template needs it.
 *
 *   Q3  Does <TextPath> lay out the worst-case coordinate string at the same
 *       arc length on iOS and Android? The doc's ring is described as "only
 *       just fits", and a per-platform arc difference is unfixable by
 *       choosing decimal places.
 *
 * Reach it at /spike-seal.
 */
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useCallback, useRef, useState } from 'react';
import {
  Image as RNImage,
  PixelRatio,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Image as SvgImage,
  Path,
  Rect,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Text } from '@/core/ui';

/** The seal's export size, in viewBox units. Fixed by the design. */
const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;

/**
 * Mount in dp, not points-as-pixels. An offscreen mount of 1080 dp yields
 * 1080 * PixelRatio.get() pixels on iOS, which at @3x is a 3240x4050 PNG and a
 * ~10 MB base64 string decoded on the JS thread. Dividing first lands on
 * 1080x1350 px on both platforms and cuts the backing layer and the string to
 * roughly a ninth.
 */
const MOUNT_WIDTH = EXPORT_WIDTH / PixelRatio.get();
const MOUNT_HEIGHT = EXPORT_HEIGHT / PixelRatio.get();

/**
 * Worst case for Q3: three integer digits of longitude at four decimal places,
 * in the ring's own format. Deliberately NOT formatCoordinates() output, which
 * is `49.2827° N, 123.1207° W` — a space before each hemisphere letter plus a
 * comma-space separator, four glyphs wider against an arc that only just fits.
 */
const RING_COORDINATES = '49.2827°N · 123.1207°W';
const RING_TIMESTAMP = '19 SEP 2026 · 16:42 PDT';

interface SpikeResult {
  label: string;
  ok: boolean;
  detail: string;
}

/** No Buffer in React Native, and the repo has no helper. Hermes has atob. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = global.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function measure(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function spikeDirectory(): Directory {
  return new Directory(Paths.cache, 'seal-spike');
}

/** Writes a base64 PNG to the cache directory and returns its file URI. */
async function writePng(base64: string, name: string): Promise<File> {
  const directory = spikeDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, name);
  if (file.exists) file.delete();
  file.create();
  file.write(base64ToBytes(base64));
  return file;
}

/** Promisifies toDataURL, which is callback-only. */
function toDataURL(
  ref: Svg | null,
  options?: { width: number; height: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ref?.toDataURL) {
      reject(new Error('Svg ref has no toDataURL'));
      return;
    }
    const timeout = setTimeout(
      () => reject(new Error('toDataURL never called back after 15s')),
      15000,
    );
    ref.toDataURL((base64) => {
      clearTimeout(timeout);
      if (!base64) reject(new Error('toDataURL returned an empty string'));
      else resolve(base64);
    }, options);
  });
}

export default function SealSpikeScreen() {
  const { theme } = useAppTheme();
  const exportRef = useRef<Svg>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [results, setResults] = useState<SpikeResult[]>([]);
  const [running, setRunning] = useState(false);

  /**
   * Q2 needs a document-directory URI specifically, not a cache or asset one,
   * because that is where photoStore.ts puts every real photo. The picker's
   * output lands in cache, so it is copied across first.
   */
  const choosePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setResults([
        { label: 'Photo', ok: false, detail: 'Library permission denied.' },
      ]);
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;

    const directory = new Directory(Paths.document, 'seal-spike');
    directory.create({ intermediates: true, idempotent: true });
    const destination = new File(directory, 'subject.jpg');
    if (destination.exists) destination.delete();
    await new File(picked.assets[0].uri).copy(destination, { overwrite: true });
    setPhotoUri(destination.uri);
    setResults([]);
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    const found: SpikeResult[] = [];

    found.push({
      label: 'Environment',
      ok: true,
      detail:
        `${Platform.OS} · PixelRatio ${PixelRatio.get()} · ` +
        `mount ${MOUNT_WIDTH.toFixed(1)}x${MOUNT_HEIGHT.toFixed(1)} dp ` +
        `· expecting ${EXPORT_WIDTH}x${EXPORT_HEIGHT} px`,
    });

    // Q1a — the recommended path: no size options.
    try {
      const base64 = await toDataURL(exportRef.current);
      const file = await writePng(base64, 'no-options.png');
      const { width, height } = await measure(file.uri);
      const exact = width === EXPORT_WIDTH && height === EXPORT_HEIGHT;
      found.push({
        label: 'Q1a  toDataURL(cb) — no options',
        ok: width >= EXPORT_WIDTH && Math.abs(width / height - 0.8) < 0.01,
        detail:
          `${width}x${height} px, ${(base64.length / 1024 / 1024).toFixed(2)} MB base64. ` +
          (exact
            ? 'Exactly the export size. Use this path.'
            : `Off target by ${width - EXPORT_WIDTH}x${height - EXPORT_HEIGHT}. ` +
              'Check the mount size and PixelRatio division.'),
      });
    } catch (cause) {
      found.push({
        label: 'Q1a  toDataURL(cb) — no options',
        ok: false,
        detail: `FAILED: ${String(cause)}. Fall back to captureRef on a wrapping View.`,
      });
    }

    // Q1b — the variant the design doc rejects. Run it so the platform
    // difference is observed here rather than believed.
    try {
      const base64 = await toDataURL(exportRef.current, {
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
      });
      const file = await writePng(base64, 'with-options.png');
      const { width, height } = await measure(file.uri);
      found.push({
        label: 'Q1b  toDataURL(cb, {width, height})',
        ok: true,
        detail:
          `${width}x${height} px. Expected on iOS: oversized by PixelRatio, with the ` +
          'seal drawn small in one corner. Expected on Android: exactly ' +
          `${EXPORT_WIDTH}x${EXPORT_HEIGHT}. OPEN BOTH PNGs and compare composition — ` +
          'dimensions alone will not show the corner-drawing bug.',
      });
    } catch (cause) {
      found.push({
        label: 'Q1b  toDataURL(cb, {width, height})',
        ok: false,
        detail: `Threw: ${String(cause)}`,
      });
    }

    found.push({
      label: 'Q2  <Image href> with a file:// document URI',
      ok: Boolean(photoUri),
      detail: photoUri
        ? 'Photo is mounted in the SVG below AND inside both exported PNGs. ' +
          'Verify by eye in the saved files, not just on screen — the ' +
          'on-screen render and the rasterised one are different code paths. ' +
          `URI: ${photoUri}`
        : 'No photo chosen. Pick one and re-run; this question is unanswered.',
    });

    found.push({
      label: 'Q3  <TextPath> arc parity',
      ok: true,
      detail:
        'Read the ring in the preview below and in the exported PNGs. The ' +
        `string is "${RING_COORDINATES}" (${RING_COORDINATES.length} glyphs). ` +
        'Record where it ends against the tick marks on BOTH platforms. If the ' +
        'end points differ, the ring needs a per-platform arc budget or the ' +
        'coordinates move off the ring entirely.',
    });

    const directory = spikeDirectory();
    found.push({
      label: 'Files',
      ok: true,
      detail: `Written to ${directory.uri} — open them to check composition.`,
    });

    setResults(found);
    setRunning(false);
  }, [photoUri]);

  const seal = (
    <>
      <Defs>
        {/* Upper arc, clockwise, so text sits upright over the top. */}
        <Path
          id="ringTop"
          d="M 540,560 m -380,0 a 380,380 0 1,1 760,0"
          fill="none"
        />
        {/* Lower arc, anticlockwise, so text is not upside down. */}
        <Path
          id="ringBot"
          d="M 540,560 m -330,0 a 330,330 0 1,0 660,0"
          fill="none"
        />
      </Defs>

      <Rect x="0" y="0" width={EXPORT_WIDTH} height={EXPORT_HEIGHT} fill="#FFF8EC" />

      {/* Q2: the photograph, straight from the document directory. */}
      {photoUri ? (
        <SvgImage
          x="0"
          y="0"
          width={EXPORT_WIDTH}
          height={EXPORT_HEIGHT}
          href={{ uri: photoUri }}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <Rect
          x="0"
          y="0"
          width={EXPORT_WIDTH}
          height={EXPORT_HEIGHT}
          fill="#C9C4BA"
        />
      )}

      {/* Corner markers. If these are missing from an export, the raster
          covered only part of the viewBox — the iOS corner-drawing bug. */}
      <Rect x="0" y="0" width="120" height="24" fill="#C2410C" />
      <Rect x={EXPORT_WIDTH - 120} y="0" width="120" height="24" fill="#C2410C" />
      <Rect x="0" y={EXPORT_HEIGHT - 24} width="120" height="24" fill="#C2410C" />
      <Rect
        x={EXPORT_WIDTH - 120}
        y={EXPORT_HEIGHT - 24}
        width="120"
        height="24"
        fill="#C2410C"
      />

      {/* Q3: the ring. */}
      <G>
        <Circle cx="540" cy="560" r="470" fill="#FFF8EC" stroke="#C2410C" strokeWidth="26" />
        <Circle cx="540" cy="560" r="410" fill="none" stroke="#C2410C" strokeWidth="6" />
        <Circle cx="540" cy="560" r="250" fill="none" stroke="#C2410C" strokeWidth="12" />

        {/* Tick marks at the 3 and 9 o'clock positions. Where the ring text
            ends relative to these is the Q3 measurement. */}
        <Rect x="76" y="554" width="40" height="12" fill="#14213A" />
        <Rect x={EXPORT_WIDTH - 116} y="554" width="40" height="12" fill="#14213A" />

        <SvgText
          fill="#C2410C"
          fontSize="54"
          fontWeight="bold"
          letterSpacing="4"
        >
          <TextPath href="#ringTop" startOffset="50%" textAnchor="middle">
            {RING_COORDINATES}
          </TextPath>
        </SvgText>
        <SvgText fill="#C2410C" fontSize="44" letterSpacing="5">
          <TextPath href="#ringBot" startOffset="50%" textAnchor="middle">
            {RING_TIMESTAMP}
          </TextPath>
        </SvgText>

        <SvgText x="540" y="590" textAnchor="middle" fontSize="88" fontWeight="bold" fill="#C2410C">
          TORNADO
        </SvgText>
        <SvgText x="540" y="670" textAnchor="middle" fontSize="44" fill="#C2410C">
          CHASE 94
        </SvgText>
      </G>

      {/* A baseline for Q3: the same string set flat. If the flat one matches
          across platforms but the ring one does not, TextPath is the culprit
          rather than the font. */}
      <SvgText
        x="540"
        y={EXPORT_HEIGHT - 120}
        textAnchor="middle"
        fontSize="54"
        fontWeight="bold"
        letterSpacing="4"
        fill="#14213A"
      >
        {RING_COORDINATES}
      </SvgText>
    </>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
    >
      <Text variant="display" style={{ marginBottom: 4 }}>
        Seal spike
      </Text>
      <Text variant="caption" tone="muted" style={{ marginBottom: 16 }}>
        Throwaway. Step 1 of docs/designs/storm-seal.md. Run on a real device,
        on both platforms, then delete this file.
      </Text>

      <Button
        title={photoUri ? 'Choose a different photo' : '1 · Choose a photo'}
        tone="secondary"
        onPress={choosePhoto}
        style={{ marginBottom: 8 }}
      />
      <Button
        title="2 · Run the spike"
        loading={running}
        onPress={run}
        style={{ marginBottom: 16 }}
      />

      {results.map((result) => (
        <Panel
          key={result.label}
          label={`${result.ok ? '✓' : '✗'}  ${result.label}`}
          style={{ marginBottom: 12 }}
        >
          <Text variant="body" tone={result.ok ? 'default' : 'muted'}>
            {result.detail}
          </Text>
        </Panel>
      ))}

      <Panel label="On-screen preview" style={{ marginBottom: 12 }}>
        <Text variant="caption" tone="muted" style={{ marginBottom: 8 }}>
          Scaled down. This is the on-screen path, not the raster path — they
          can disagree, which is the point of the exported files.
        </Text>
        <Svg width="100%" height={340} viewBox={`0 0 ${EXPORT_WIDTH} ${EXPORT_HEIGHT}`}>
          {seal}
        </Svg>
      </Panel>

      {/* The export mount. Full size, offscreen, never visible. Its own tree,
          separate from the preview, because toDataURL with no options reads
          the MOUNTED size. */}
      <View
        style={{ position: 'absolute', left: -20000, top: 0 }}
        pointerEvents="none"
      >
        <Svg
          ref={exportRef}
          width={MOUNT_WIDTH}
          height={MOUNT_HEIGHT}
          viewBox={`0 0 ${EXPORT_WIDTH} ${EXPORT_HEIGHT}`}
        >
          {seal}
        </Svg>
      </View>
    </ScrollView>
  );
}
