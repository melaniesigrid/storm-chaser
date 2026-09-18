import { useState } from 'react';
import { Image, TextInput, View } from 'react-native';

import { Button, Chip, Panel, Text } from '@/core/ui';
import {
  formatCoordinates,
  formatPressure,
  formatSpeed,
  formatTemperature,
  formatTimestamp,
} from '@/core/utils/format';
import type { Coordinates } from '@/features/weather/model/types';

import { STORM_TYPES } from '../model/stormTypes';
import type { CapturedConditions, StormTypeId } from '../model/types';

export interface StormMetadataFormValues {
  stormType: StormTypeId;
  notes: string;
}

export interface StormMetadataFormProps {
  photoUri: string;
  capturedAt: string;
  coordinates: Coordinates | null;
  conditions: CapturedConditions | null;
  saving: boolean;
  errorMessage?: string | null;
  onSubmit: (values: StormMetadataFormValues) => void;
  onCancel: () => void;
}

/**
 * Metadata is collected after the shot, not before: in the field the photo is
 * time critical and the paperwork is not. Location, timestamp and conditions are
 * captured automatically and shown read only so the chaser can verify them.
 */
export function StormMetadataForm({
  photoUri,
  capturedAt,
  coordinates,
  conditions,
  saving,
  errorMessage,
  onSubmit,
  onCancel,
}: StormMetadataFormProps) {
  const [stormType, setStormType] = useState<StormTypeId>('supercell');
  const [notes, setNotes] = useState('');

  return (
    <View className="gap-3">
      <Image
        source={{ uri: photoUri }}
        className="h-56 w-full rounded-panel"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <Panel label="Classification">
        <View className="flex-row flex-wrap gap-2">
          {STORM_TYPES.map((type) => (
            <Chip
              key={type.id}
              label={type.label}
              selected={stormType === type.id}
              onPress={() => setStormType(type.id)}
            />
          ))}
        </View>
      </Panel>

      <Panel label="Field notes">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          maxLength={500}
          placeholder="Structure, rotation, hail size, road and bearing..."
          placeholderTextColor="#6B7280"
          textAlignVertical="top"
          accessibilityLabel="Field notes"
          className="min-h-[90px] font-sans text-[15px] text-ink-800 dark:text-bone-50"
        />
        <Text variant="label" className="mt-2 text-right">
          {`${notes.length}/500`}
        </Text>
      </Panel>

      <Panel label="Captured automatically">
        <Row label="Time" value={formatTimestamp(capturedAt)} />
        <Row
          label="Position"
          value={
            coordinates
              ? formatCoordinates(coordinates.latitude, coordinates.longitude)
              : 'No fix available'
          }
        />
        {conditions ? (
          <>
            <Row label="Conditions" value={conditions.conditionLabel} />
            <Row label="Temperature" value={formatTemperature(conditions.temperatureC)} />
            <Row label="Wind gust" value={formatSpeed(conditions.windGustKmh)} />
            <Row label="Pressure" value={formatPressure(conditions.pressureHpa)} />
            <Row
              label="CAPE"
              value={conditions.capeJkg === null ? 'n/a' : `${Math.round(conditions.capeJkg)} J/kg`}
            />
          </>
        ) : (
          <Row label="Conditions" value="Not available at capture time" />
        )}
      </Panel>

      {errorMessage ? (
        <Text variant="caption" className="text-supercell">
          {errorMessage}
        </Text>
      ) : null}

      <View className="gap-3 pb-10">
        <Button
          title="Save to log"
          loading={saving}
          onPress={() => onSubmit({ stormType, notes: notes.trim() })}
        />
        <Button title="Discard" tone="ghost" onPress={onCancel} disabled={saving} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-bone-200 py-2 last:border-b-0 dark:border-ink-600">
      <Text variant="label">{label}</Text>
      <Text className="font-mono text-[12px] text-ink-800 dark:text-bone-50">{value}</Text>
    </View>
  );
}
