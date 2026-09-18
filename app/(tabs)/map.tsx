import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Chip, Panel, Text } from '@/core/ui';
import { usePublishLastKnownPosition } from '@/features/location/lastKnownPosition';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { useCommunityReports } from '@/features/storms/hooks/useCommunityReports';
import { useStormReports } from '@/features/storms/hooks/useStormLog';
import { isDemoSet, type CommunityReport } from '@/features/storms/model/community';
import { STORM_LEGENDS, describeLegendKind } from '@/features/storms/model/legends';
import { boundingRegion } from '@/features/storms/model/mapRegion';
import { chaseLevelForTier, describeStormType } from '@/features/storms/model/stormTypes';
import type { StormReport } from '@/features/storms/model/types';
import { toLevel } from '@/features/weather/model/severity';

export default function MapScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const location = useDeviceLocation();
  const { data } = useStormReports();
  const { data: community } = useCommunityReports(location.coordinates);

  // This screen pays for a position fix anyway, so the legend detail screen
  // opened from a pin can borrow it rather than waking the GPS for one line.
  usePublishLastKnownPosition(location.coordinates);

  /**
   * Lore is on by default: it is what makes the map worth opening on the first
   * run, before anything has been logged. It is a toggle rather than a fixed
   * layer because twenty-two pins of other people's weather is noise once you
   * are actually looking at your own.
   */
  const [showLore, setShowLore] = useState(true);

  const located = useMemo(
    () => (data ?? []).filter((report) => report.coordinates !== null),
    [data],
  );

  // Memoised so the marker layers keep referential equality across a lore
  // toggle: a fresh `community ?? []` every render defeats every memo below.
  const others = useMemo(() => community ?? [], [community]);
  const demo = isDemoSet(others);

  const region = useMemo<Region | undefined>(() => boundingRegion(located), [located]);

  const openReport = useCallback((id: string) => router.push(`/storm/${id}`), [router]);
  const openLegend = useCallback(
    (id: string) => router.push({ pathname: '/legend/[id]', params: { id } }),
    [router],
  );

  /**
   * Nothing of anyone's to plot. The map still renders — with lore on there are
   * twenty-two pins on it — so the call to action rides above it in a panel
   * instead of replacing the screen. Replacing it hid the only onboarding CTA
   * in the app behind a toggle that defaults to on, and stranded anyone who
   * turned lore off with no way to turn it back on.
   */
  // Gated on the chaser's OWN reports only. `others` is seeded demo data and
  // is never empty once a position resolves, so including it here put the
  // onboarding CTA behind a condition that first run can't reach. Six pins
  // from fictional chasers are not a reason to hide "Document a storm".
  const nothingPlotted = !located.length;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        showsCompass
      >
        <OwnReportMarkers reports={located} onOpen={openReport} />
        <CommunityMarkers reports={others} />
        {showLore ? <LoreMarkers onOpen={openLegend} /> : null}
      </MapView>

      <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
        {nothingPlotted ? (
          <Panel style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <WeatherIcon name="compass" size={56} />
              <View style={{ flex: 1 }}>
                <Text variant="title">Nothing to plot</Text>
                <Text variant="body" tone="muted" style={{ marginTop: 6 }}>
                  The diamonds are storm legends, not reports. Capture one with a position
                  fix and it appears here, coloured by severity.
                </Text>
              </View>
            </View>
            <Button
              title="Document a storm"
              tone="secondary"
              style={{ marginTop: 14, borderColor: theme.colors.text }}
              onPress={() => router.push('/capture')}
            />
          </Panel>
        ) : null}

        <Panel>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Text variant="label">{`${located.length} yours`}</Text>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <Legend color={theme.colors.tier.severe} label="Severe" />
              <Legend color={theme.colors.tier.active} label="Notable" />
              <Legend color={theme.colors.tier.unsettled} label="Other" />
            </View>
          </View>

          {others.length > 0 ? (
            <Row>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderWidth: 3,
                  borderColor: theme.colors.textMuted,
                  backgroundColor: theme.colors.surface,
                }}
              />
              <Text variant="label" style={{ flex: 1 }}>
                {demo
                  ? `${others.length} community · demo data`
                  : `${others.length} from other chasers`}
              </Text>
            </Row>
          ) : null}

          <Row>
            <View
              style={{
                width: 12,
                height: 12,
                borderWidth: 3,
                borderColor: theme.colors.accent,
                backgroundColor: theme.colors.surface,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <Text variant="label" style={{ flex: 1 }}>
              {showLore
                ? `${STORM_LEGENDS.length} storm legends · tap a pin`
                : 'Storm legends hidden'}
            </Text>
            <Chip
              label={showLore ? 'Hide lore' : 'Show lore'}
              selected={showLore}
              onPress={() => setShowLore((value) => !value)}
            />
          </Row>
        </Panel>
      </View>
    </View>
  );
}

/**
 * The three marker layers are separate memoised components so toggling lore
 * re-renders the lore pins alone. Inline, a toggle re-ran describeStormType and
 * chaseLevelForTier for every own report and every community pin on screen.
 * They read the theme themselves rather than taking colours as props: memo does
 * not block a context change, so a theme switch still repaints all three.
 */
const OwnReportMarkers = memo(function OwnReportMarkers({
  reports,
  onOpen,
}: {
  reports: StormReport[];
  onOpen: (id: string) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <>
      {reports.map((report) => {
        const type = describeStormType(report.stormType);
        return (
          <Marker
            key={report.id}
            coordinate={report.coordinates as { latitude: number; longitude: number }}
            pinColor={theme.colors.tier[chaseLevelForTier(type.tier)]}
            title={type.label}
            description={report.notes || 'No notes recorded'}
            onCalloutPress={() => onOpen(report.id)}
            tracksViewChanges={false}
          />
        );
      })}
    </>
  );
});

/**
 * Community pins are drawn as hollow rings rather than solid pins, so someone
 * else's storm can never be mistaken for one of your own at a glance. They
 * carry no onCalloutPress: there is no local report to open.
 */
const CommunityMarkers = memo(function CommunityMarkers({
  reports,
}: {
  reports: CommunityReport[];
}) {
  const { theme } = useAppTheme();

  return (
    <>
      {reports.map((report) => (
        <Marker
          key={report.id}
          coordinate={report.coordinates}
          title={`${describeStormType(report.stormType).label} · ${report.chaser}`}
          description={report.notes}
          tracksViewChanges={false}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 4,
              borderColor: theme.colors.tier[toLevel(report.chaseScore)],
              backgroundColor: theme.colors.surface,
            }}
          />
        </Marker>
      ))}
    </>
  );
});

/**
 * Storm lore: famous places, not reports. A third shape — a diamond on the
 * accent colour — so the three kinds of pin stay tellable apart without reading
 * a single label, including for anyone who cannot rely on the colour
 * difference.
 */
const LoreMarkers = memo(function LoreMarkers({ onOpen }: { onOpen: (id: string) => void }) {
  const { theme } = useAppTheme();

  return (
    <>
      {STORM_LEGENDS.map((legend) => (
        <Marker
          key={legend.id}
          coordinate={legend.coordinates}
          title={legend.name}
          description={`${describeLegendKind(legend.kind)} · ${legend.claim}`}
          onCalloutPress={() => onOpen(legend.id)}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
          centerOffset={{ x: 0, y: 0 }}
        >
          {/*
            A marker's child view is its whole hit area, and an 18px diamond is
            far under the 44px minimum the rest of the app holds to. The
            transparent 44x44 box is the target; the diamond stays the visual.
            A marker anchors its child at {x: 0.5, y: 1.0} — bottom centre —
            so growing the box would hang the diamond above the place it marks
            and out of register with the community rings. The explicit centre
            anchor keeps the visual on its coordinate.
          */}
          <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 18,
                height: 18,
                borderWidth: 3,
                borderColor: theme.colors.accent,
                backgroundColor: theme.colors.surface,
                transform: [{ rotate: '45deg' }],
              }}
            />
          </View>
        </Marker>
      ))}
    </>
  );
});

/** A divided row inside the map legend panel. */
function Row({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
      }}
    >
      {children}
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ backgroundColor: color, height: 10, width: 10, borderRadius: 5 }} />
      <Text variant="label">{label}</Text>
    </View>
  );
}
