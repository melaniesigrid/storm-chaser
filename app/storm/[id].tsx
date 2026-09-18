import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Image, ScrollView, View } from 'react-native';

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
  const { data: report, isLoading, isError } = useStormReport(id);
  const deleteReport = useDeleteStormReport();

  if (isLoading) {
    return (
      <View className="flex-1 bg-bone-50 p-4 dark:bg-ink-800">
        <Skeleton height={240} />
      </View>
    );
  }

  if (isError || !report) {
    return (
      <View className="flex-1 items-center justify-center bg-bone-50 p-6 dark:bg-ink-800">
        <Text variant="title" className="mb-2">
          Report not found
        </Text>
        <Text variant="caption" className="mb-6 text-center">
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
      className="flex-1 bg-bone-50 dark:bg-ink-800"
      contentContainerClassName="p-4 pb-12"
    >
      <Image
        source={{ uri: report.photoUri }}
        className="mb-4 h-72 w-full rounded-panel"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityLabel={`Photograph of a ${type.label.toLowerCase()}`}
      />

      <Panel className="mb-3">
        <Text variant="display" className="mb-1">
          {type.label}
        </Text>
        <Text variant="caption">{formatTimestamp(report.capturedAt)}</Text>
      </Panel>

      {report.notes ? (
        <Panel label="Field notes" className="mb-3">
          <Text variant="body">{report.notes}</Text>
        </Panel>
      ) : null}

      <Panel label="Position" className="mb-3">
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
        <Panel label="Conditions at capture" className="mb-3">
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

      <Panel label="Record" className="mb-4">
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
  return (
    <View className="flex-row items-center justify-between border-b border-bone-200 py-2 dark:border-ink-600">
      <Text variant="label">{label}</Text>
      <Text className="ml-4 flex-1 text-right font-mono text-[12px] text-ink-800 dark:text-bone-50">
        {value}
      </Text>
    </View>
  );
}
