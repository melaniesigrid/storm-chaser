import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Skeleton, Text } from '@/core/ui';
import {
  formatBearing,
  formatCoordinates,
  formatPercent,
  formatPrecipitation,
  formatPressure,
  formatSpeed,
  formatTemperature,
  formatTimestamp,
} from '@/core/utils/format';
import {
  useDeleteStormReport,
  useStormReport,
} from '@/features/storms/hooks/useStormLog';
import { describeStormType } from '@/features/storms/model/stormTypes';

export default function StormDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { data: report, isLoading, isError } = useStormReport(id);
  const deleteReport = useDeleteStormReport();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 16 }}>
        <Skeleton height={240} />
      </View>
    );
  }

  if (isError || !report) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 }}>
        <Text variant="title" style={{ marginBottom: 8 }}>
          Report not found
        </Text>
        <Text variant="body" tone="muted" style={{ marginBottom: 24, textAlign: 'center' }}>
          It may have been deleted from this device.
        </Text>
        <Button title="Back to log" tone="secondary" onPress={() => router.replace('/log')} />
      </View>
    );
  }

  const type = describeStormType(report.stormType);

  function confirmDelete() {
    if (!report) return;
    Alert.alert('Delete this report?', 'The photo and its metadata are removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteReport.mutate(report, { onSuccess: () => router.replace('/log') }),
      },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <Image
        source={{ uri: report.photoUri }}
        style={{ marginBottom: 16, height: 288, width: '100%', borderRadius: theme.radius.panel }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityLabel={`Photograph of a ${type.label.toLowerCase()}`}
      />

      <Panel style={{ marginBottom: 12 }}>
        <Text variant="display" style={{ marginBottom: 4 }}>
          {type.label}
        </Text>
        <Text variant="caption">{formatTimestamp(report.capturedAt)}</Text>
      </Panel>

      {report.notes ? (
        <Panel label="Field notes" style={{ marginBottom: 12 }}>
          <Text variant="body">{report.notes}</Text>
        </Panel>
      ) : null}

      <Panel label="Position" style={{ marginBottom: 12 }}>
        <Row
          label="Coordinates"
          value={
            report.coordinates
              ? formatCoordinates(report.coordinates.latitude, report.coordinates.longitude)
              : 'No fix recorded'
          }
        />
        <Row
          label="Accuracy"
          value={
            report.locationAccuracyM === null
              ? 'Unknown'
              : `${Math.round(report.locationAccuracyM)} m`
          }
        />
      </Panel>

      {report.conditions ? (
        <Panel label="Conditions at capture" style={{ marginBottom: 12 }}>
          <Row label="Observed" value={report.conditions.conditionLabel} />
          <Row label="Temperature" value={formatTemperature(report.conditions.temperatureC)} />
          <Row label="Wind" value={formatSpeed(report.conditions.windSpeedKmh)} />
          <Row label="Gusts" value={formatSpeed(report.conditions.windGustKmh)} />
          <Row label="Direction" value={formatBearing(report.conditions.windDirectionDeg)} />
          <Row label="Pressure" value={formatPressure(report.conditions.pressureHpa)} />
          <Row label="Humidity" value={formatPercent(report.conditions.humidityPct)} />
          <Row
            label="Precipitation"
            value={formatPrecipitation(report.conditions.precipitationMm)}
          />
          <Row
            label="CAPE"
            value={
              report.conditions.capeJkg === null
                ? 'n/a'
                : `${Math.round(report.conditions.capeJkg)} J/kg`
            }
          />
          <Row label="Chase index" value={`${report.conditions.chaseScore}/100`} />
        </Panel>
      ) : null}

      <Panel label="Classification" style={{ marginBottom: 12 }}>
        <Text variant="body">{describeStormType(report.stormType).description}</Text>
      </Panel>

      <Panel label="Record" style={{ marginBottom: 16 }}>
        {/* Photo source sits in the record panel rather than beside the image:
            it is provenance, not decoration. */}
        <Row
          label="Photo"
          value={report.photoSource === 'library' ? 'Imported from library' : 'Shot in app'}
        />
        <Row label="Sync" value={report.syncState} />
        <Row label="Id" value={report.id} />
      </Panel>

      <Button
        title="Delete report"
        tone="danger"
        loading={deleteReport.isPending}
        onPress={confirmDelete}
      />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: 10,
      }}
    >
      <Text variant="label">{label}</Text>
      <Text
        variant="body"
        style={{ marginLeft: 16, flex: 1, textAlign: 'right', fontFamily: theme.type.mono, fontSize: 14 }}
      >
        {value}
      </Text>
    </View>
  );
}
