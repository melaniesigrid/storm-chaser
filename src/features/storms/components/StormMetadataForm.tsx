import { useState } from 'react';
import { Image, TextInput, View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Chip, Panel, Text } from '@/core/ui';
import {
  formatCoordinates,
  formatPressure,
  formatSpeed,
  formatTemperature,
  formatTimestamp,
} from '@/core/utils/format';
import type { Coordinates } from '@/features/weather/model/types';

import { chaseLevelForTier, describeStormType, STORM_TYPES } from '../model/stormTypes';
import type { CapturedConditions, PhotoSource, StormTypeId } from '../model/types';

export interface StormMetadataFormValues {
  stormType: StormTypeId;
  notes: string;
}

export interface StormMetadataFormProps {
  photoUri: string;
  photoSource: PhotoSource;
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
  photoSource,
  capturedAt,
  coordinates,
  conditions,
  saving,
  errorMessage,
  onSubmit,
  onCancel,
}: StormMetadataFormProps) {
  const { theme } = useAppTheme();
  const [stormType, setStormType] = useState<StormTypeId>('supercell');
  const [notes, setNotes] = useState('');

  return (
    <View style={{ gap: 12 }}>
      <Image
        source={{ uri: photoUri }}
        style={{ height: 224, width: '100%', borderRadius: theme.radius.panel }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <Panel label="Classification">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {STORM_TYPES.map((type) => (
            <Chip
              key={type.id}
              label={type.label}
              selected={stormType === type.id}
              accent={theme.colors.tier[chaseLevelForTier(type.tier)]}
              onPress={() => setStormType(type.id)}
            />
          ))}
        </View>

        {/*
          The description of whatever is selected, in place rather than behind a
          second tap. Twelve labels are not self-explanatory to someone learning
          the sky, and a wall cloud filed as a shelf cloud is a wrong record
          rather than an untidy one. It sits below the chips so the block does
          not reflow the grid as the selection moves between a one-line and a
          two-line description.
        */}
        <Text variant="message" tone="muted" style={{ marginTop: 12 }}>
          {describeStormType(stormType).description}
        </Text>
      </Panel>

      {photoSource === 'library' ? (
        <Text variant="message" tone="muted">
          Imported photo. The position and conditions below are this device&apos;s, now —
          not necessarily the storm&apos;s.
        </Text>
      ) : null}

      <Panel label="Field notes">
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          maxLength={500}
          placeholder="Structure, rotation, hail size, road and bearing..."
          placeholderTextColor={theme.colors.textMuted}
          textAlignVertical="top"
          accessibilityLabel="Field notes"
          style={{
            minHeight: 96,
            fontFamily: theme.type.body,
            fontSize: 17,
            lineHeight: 24,
            color: theme.colors.text,
          }}
        />
        <Text variant="label" style={{ marginTop: 8, textAlign: 'right' }}>
          {`${notes.length}/500`}
        </Text>
      </Panel>

      <Panel label="Captured automatically">
        <Row label="Source" value={photoSource === 'camera' ? 'Camera' : 'Imported'} />
        <Row
          label={photoSource === 'camera' ? 'Time' : 'Photo taken'}
          value={formatTimestamp(capturedAt)}
        />
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
          <Row label="Conditions" value="Not available at capture time" last />
        )}
      </Panel>

      {errorMessage ? (
        <Text variant="message" color={theme.colors.tierText.severe}>
          {errorMessage}
        </Text>
      ) : null}

      <View style={{ gap: 12, paddingBottom: 40 }}>
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

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <Text variant="label">{label}</Text>
      <Text
        variant="body"
        style={{ flex: 1, textAlign: 'right', fontFamily: theme.type.mono, fontSize: 14 }}
      >
        {value}
      </Text>
    </View>
  );
}
