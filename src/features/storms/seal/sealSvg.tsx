import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Path,
  Rect,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';

import type { SealData } from './sealData';
import type { SealTemplateId } from './sealTemplates';

/**
 * The seal, drawn.
 *
 * One pure function of (data, template) -> SVG. No hooks, no theme context,
 * no device APIs, no clock: the same inputs always produce the same picture,
 * which is what lets the export mount a second copy at full size and get a
 * file identical to the preview.
 *
 * Every dimension below is in viewBox units, never points. The preview is
 * about 340pt wide and the export is 1080px, and the only thing that differs
 * between them is the `width` prop -- there is deliberately no second size
 * table to keep in step.
 *
 * It ignores the app theme on purpose. A seal is a printed object that leaves
 * the phone, so one shared from Skyward Night has to be the same artifact as
 * one shared from Field Card.
 */

export const SEAL_WIDTH = 1080;
export const SEAL_HEIGHT = 1350;

/**
 * Field Card's stock, hard-coded rather than read from the theme.
 *
 * These are the shipped Field Card values (themes.ts): cream paper, deep ink,
 * and the tier accents. Pulling them from the active theme would make the
 * exported file depend on what the chaser happened to be wearing.
 */
const PAPER = '#FFF8EC';
const INK = '#14213A';
const MUTED = '#5A6275';

const TIER_INK: Record<SealData['tier'], string> = {
  severe: '#C2410C',
  notable: '#B45309',
  routine: '#4B5563',
};

/** Severe is heavier stock. Weight and shadow carry tier, not colour alone. */
const TIER_RULE: Record<SealData['tier'], number> = {
  severe: 14,
  notable: 10,
  routine: 6,
};

const TIER_LABEL: Record<SealData['tier'], string> = {
  severe: 'SEVERE',
  notable: 'NOTABLE',
  routine: 'ROUTINE',
};

export interface SealSvgProps {
  data: SealData;
  template: SealTemplateId;
  /** The photograph. Omitted in tests and when a report has lost its file. */
  photoUri?: string | null;
  /** Rendered width. Height follows the 4:5 viewBox. */
  width: number;
  /** Set by the export mount so the raster can be found. */
  svgRef?: React.Ref<Svg>;
}

export function SealSvg({ data, template, photoUri, width, svgRef }: SealSvgProps) {
  const accent = TIER_INK[data.tier];
  const height = (width / SEAL_WIDTH) * SEAL_HEIGHT;

  return (
    <Svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${SEAL_WIDTH} ${SEAL_HEIGHT}`}
      accessibilityRole="image"
      accessibilityLabel={`${data.classification} seal, ${data.date}`}
    >
      <Defs>
        <ClipPath id="sealPhotoClip">
          {template === 'wax' ? (
            <Rect x="0" y="0" width={SEAL_WIDTH} height={SEAL_HEIGHT} />
          ) : (
            <Rect x="48" y="48" width={SEAL_WIDTH - 96} height="620" />
          )}
        </ClipPath>
        {/* Upper arc runs clockwise so ring text sits upright over the top. */}
        <Path id="sealRingTop" d="M 540 620 m -372 0 a 372 372 0 1 1 744 0" fill="none" />
        {/* Lower arc runs anticlockwise so its text is not upside down. */}
        <Path id="sealRingBottom" d="M 540 620 m -318 0 a 318 318 0 1 0 636 0" fill="none" />
      </Defs>

      <Rect x="0" y="0" width={SEAL_WIDTH} height={SEAL_HEIGHT} fill={PAPER} />

      {photoUri ? (
        <SvgImage
          x={template === 'wax' ? 0 : 48}
          y={template === 'wax' ? 0 : 48}
          width={template === 'wax' ? SEAL_WIDTH : SEAL_WIDTH - 96}
          height={template === 'wax' ? SEAL_HEIGHT : 620}
          href={{ uri: photoUri }}
          // Crop to fill. Letterboxing a portrait photo onto cream stock puts
          // cream bars inside a cream card, which reads as a bug.
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#sealPhotoClip)"
        />
      ) : (
        <Rect
          x={template === 'wax' ? 0 : 48}
          y={template === 'wax' ? 0 : 48}
          width={template === 'wax' ? SEAL_WIDTH : SEAL_WIDTH - 96}
          height={template === 'wax' ? SEAL_HEIGHT : 620}
          fill="#C9C4BA"
        />
      )}

      {template === 'wax' ? (
        <WaxSeal data={data} accent={accent} />
      ) : (
        <CardBody data={data} template={template} accent={accent} />
      )}
    </Svg>
  );
}

/**
 * The stamp: a ring over the photograph, with the coordinates as real
 * lettering around it.
 *
 * The ring is what makes this a seal rather than a logo watermark, so the
 * coordinates go on the arc rather than under it. Six fields is the ceiling
 * and everything else is dropped -- that is the template's whole premise.
 */
function WaxSeal({ data, accent }: { data: SealData; accent: string }) {
  // With no coordinates the timestamp is promoted to the upper arc and the
  // classification drops to the lower, so the ring keeps its balance rather
  // than going bald at the top.
  const upper = data.ringCoordinates ?? `${data.date} · ${data.time}`;
  const lower = data.ringCoordinates ? `${data.date} · ${data.time}` : data.classification;

  return (
    <G>
      <Circle cx="540" cy="620" r="452" fill={PAPER} fillOpacity={0.93} stroke={accent} strokeWidth="26" />
      <Circle cx="540" cy="620" r="402" fill="none" stroke={accent} strokeWidth="5" strokeDasharray="6 14" />
      <Circle cx="540" cy="620" r="246" fill="none" stroke={accent} strokeWidth="11" />

      <SvgText fill={accent} fontSize="52" fontWeight="bold" letterSpacing="3">
        <TextPath href="#sealRingTop" startOffset="50%" textAnchor="middle">
          {upper}
        </TextPath>
      </SvgText>
      <SvgText fill={accent} fontSize="42" fontWeight="bold" letterSpacing="4">
        <TextPath href="#sealRingBottom" startOffset="50%" textAnchor="middle">
          {lower}
        </TextPath>
      </SvgText>

      {/* The bolt, drawn rather than borrowed, scaled into the middle. */}
      <G transform="translate(540 500) scale(5.2) translate(-12 -12)">
        <Path d="M14.2 1.2 4.6 13.9h5.4l-1.6 8.9L19.4 10.1h-5.4z" fill={accent} />
      </G>

      <SvgText x="540" y="700" textAnchor="middle" fontSize="76" fontWeight="bold" fill={accent}>
        {data.classification}
      </SvgText>
      {data.chaseScore !== null ? (
        <SvgText x="540" y="762" textAnchor="middle" fontSize="40" fontWeight="bold" letterSpacing="4" fill={accent}>
          {`CHASE ${data.chaseScore}`}
        </SvgText>
      ) : null}
      {data.filedFromLibrary ? (
        <SvgText x="540" y="812" textAnchor="middle" fontSize="28" letterSpacing="4" fill={accent}>
          FILED FROM LIBRARY
        </SvgText>
      ) : null}
    </G>
  );
}

/** Field Card and Collectible: the photo mounted on stock, the record below. */
function CardBody({
  data,
  template,
  accent,
}: {
  data: SealData;
  template: SealTemplateId;
  accent: string;
}) {
  const collectible = template === 'collectible';
  const rule = TIER_RULE[data.tier];

  // Two columns of instruments, filled down then across.
  const rows = Math.ceil(data.fields.length / 2);

  return (
    <G>
      {/* The frame. Severe gets the heaviest edge; routine loses the weight. */}
      <Rect
        x={rule / 2}
        y={rule / 2}
        width={SEAL_WIDTH - rule}
        height={SEAL_HEIGHT - rule}
        fill="none"
        stroke={INK}
        strokeWidth={rule}
      />

      {collectible ? (
        <>
          <Rect x="48" y="700" width="330" height="58" fill={accent} />
          <SvgText x="66" y="742" fontSize="34" fontWeight="bold" letterSpacing="4" fill={PAPER}>
            {`${TIER_LABEL[data.tier]} · No. ${data.serial}`}
          </SvgText>
        </>
      ) : null}

      <SvgText
        x="48"
        y={collectible ? 852 : 800}
        fontSize="112"
        fontWeight="bold"
        fill={INK}
      >
        {data.classification}
      </SvgText>

      <SvgText x="48" y={collectible ? 916 : 864} fontSize="40" fill={MUTED}>
        {data.cardCoordinates ?? 'NO FIX RECORDED'}
        {data.accuracy ? `  ${data.accuracy}` : ''}
      </SvgText>
      <SvgText x="48" y={collectible ? 968 : 916} fontSize="40" fill={MUTED}>
        {`${data.date} · ${data.time}`}
      </SvgText>

      <Rect
        x="48"
        y={collectible ? 1004 : 952}
        width={SEAL_WIDTH - 96}
        height={rule}
        fill={INK}
        // Dashed rules are how provenance is carried, because weight already
        // means tier and the mono face already means an instrument.
        opacity={data.filedFromLibrary ? 0.45 : 1}
      />

      {data.hasConditions ? (
        data.fields.map((field, index) => {
          const column = index < rows ? 0 : 1;
          const row = index < rows ? index : index - rows;
          return (
            <SvgText
              key={field.id}
              x={48 + column * 500}
              y={(collectible ? 1074 : 1022) + row * 54}
              fontSize="38"
              fill={INK}
            >
              {`${field.label} ${field.value ?? '—'}`}
            </SvgText>
          );
        })
      ) : (
        <SvgText x="48" y={collectible ? 1074 : 1022} fontSize="38" fill={MUTED}>
          — NO CONDITIONS RECORDED —
        </SvgText>
      )}

      {data.filedFromLibrary ? (
        <SvgText x="48" y={SEAL_HEIGHT - 112} fontSize="30" letterSpacing="3" fill={MUTED}>
          FILED FROM LIBRARY
        </SvgText>
      ) : null}

      <G transform="translate(48 1258) scale(2) translate(-4 -12)">
        <Path d="M14.2 1.2 4.6 13.9h5.4l-1.6 8.9L19.4 10.1h-5.4z" fill={INK} />
      </G>
      <SvgText x="106" y="1282" fontSize="34" fontWeight="bold" letterSpacing="4" fill={INK}>
        STORM CHASER
      </SvgText>

      {data.chaseScore !== null ? (
        <SvgText
          x={SEAL_WIDTH - 48}
          y="1282"
          textAnchor="end"
          fontSize="34"
          fontWeight="bold"
          letterSpacing="2"
          fill={accent}
        >
          {collectible ? `CHASE ${data.chaseScore} / 100` : `CHASE ${data.chaseScore}`}
        </SvgText>
      ) : null}
    </G>
  );
}
