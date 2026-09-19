import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Text } from '@/core/ui';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import { pickPhotoFromLibrary } from '@/features/storms/data/photoPicker';
import {
  StormMetadataForm,
  type StormMetadataFormValues,
} from '@/features/storms/components/StormMetadataForm';
import { useCreateStormReport } from '@/features/storms/hooks/useStormLog';
import type { CapturedConditions, PhotoSource } from '@/features/storms/model/types';
import { useWeatherSnapshot } from '@/features/weather/hooks/useWeather';
import type { WeatherSnapshot } from '@/features/weather/model/types';

type Phase =
  | { name: 'camera' }
  | { name: 'metadata'; photoUri: string; capturedAt: string; photoSource: PhotoSource };

export default function CaptureScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ name: 'camera' });
  const [shooting, setShooting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const location = useDeviceLocation();
  // Reads straight from the cache populated by the Conditions tab, so the
  // capture flow never blocks on the network.
  const weather = useWeatherSnapshot(location.coordinates);
  const createReport = useCreateStormReport();

  async function takePhoto() {
    setErrorMessage(null);
    setShooting(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) {
        setErrorMessage('The camera did not return an image. Try again.');
        return;
      }
      setPhase({
        name: 'metadata',
        photoUri: photo.uri,
        capturedAt: new Date().toISOString(),
        photoSource: 'camera',
      });
    } catch {
      setErrorMessage('The camera failed to capture. Try again.');
    } finally {
      setShooting(false);
    }
  }

  /**
   * The import path. It joins the camera path at the metadata phase rather than
   * beside it, so classification, notes and storage stay a single flow with one
   * set of rules.
   */
  async function importPhoto() {
    setErrorMessage(null);
    setImporting(true);
    try {
      const picked = await pickPhotoFromLibrary();
      if (!picked.ok) {
        setErrorMessage(picked.error.message);
        return;
      }
      // A dismissed picker is a decision, not an error: say nothing.
      if (!picked.value) return;

      setPhase({
        name: 'metadata',
        photoUri: picked.value.uri,
        capturedAt: picked.value.capturedAt,
        photoSource: picked.value.source,
      });
    } finally {
      setImporting(false);
    }
  }

  function save(values: StormMetadataFormValues) {
    if (phase.name !== 'metadata') return;
    setErrorMessage(null);

    createReport.mutate(
      {
        temporaryPhotoUri: phase.photoUri,
        photoSource: phase.photoSource,
        capturedAt: phase.capturedAt,
        coordinates: location.coordinates,
        locationAccuracyM: location.accuracyMeters,
        stormType: values.stormType,
        notes: values.notes,
        conditions: toCapturedConditions(weather.data),
      },
      {
        // The log screen owns the celebration; it fires over the list the
        // new report just joined.
        onSuccess: () => router.replace('/log?celebrate=1'),
        onError: (error) =>
          setErrorMessage(
            error instanceof Error ? error.message : 'The report could not be saved.',
          ),
      },
    );
  }

  // The metadata phase is checked first: an imported photo has to be fileable
  // even where the camera was refused or does not exist.
  if (phase.name === 'metadata') {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <StormMetadataForm
          photoUri={phase.photoUri}
          photoSource={phase.photoSource}
          capturedAt={phase.capturedAt}
          coordinates={location.coordinates}
          conditions={toCapturedConditions(weather.data)}
          saving={createReport.isPending}
          errorMessage={errorMessage}
          onSubmit={save}
          onCancel={() => setPhase({ name: 'camera' })}
        />
      </ScrollView>
    );
  }

  if (!permission) {
    return <Centered message="Checking camera permission..." />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 }}>
        <Panel label="Camera access">
          <Text variant="title" style={{ marginBottom: 8 }}>
            Storm Chaser needs the camera
          </Text>
          <Text variant="body" tone="muted" style={{ marginBottom: 24 }}>
            Photographs are the core of a field report. Nothing is uploaded: images stay
            on this device unless you enable cloud sync.
          </Text>
          <View style={{ gap: 12 }}>
            <Button title="Grant access" onPress={() => void requestPermission()} />
            <Button
              title="Import a photo instead"
              tone="ghost"
              loading={importing}
              onPress={() => void importPhoto()}
            />
          </View>
          {errorMessage ? (
            <Text variant="message" color={theme.colors.tierText.severe} style={{ marginTop: 12 }}>
              {errorMessage}
            </Text>
          ) : null}
        </Panel>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.cameraGround }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

      <View style={{ position: 'absolute', left: 0, right: 0, top: 16, paddingHorizontal: 20 }}>
        <Text variant="label" color={theme.colors.onCameraGround}>
          {location.coordinates
            ? `FIX ACQUIRED · ${location.coordinates.latitude.toFixed(3)}, ${location.coordinates.longitude.toFixed(3)}`
            : 'NO POSITION FIX'}
        </Text>
      </View>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 48 }}>
        {errorMessage ? (
          <Text variant="message" color={theme.colors.tier.severe} style={{ marginBottom: 12 }}>
            {errorMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture photo"
          disabled={shooting}
          onPress={() => void takePhoto()}
          style={{
            height: 84,
            width: 84,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 42,
            borderWidth: 5,
            borderColor: theme.colors.onCameraGround,
            backgroundColor: theme.colors.accent,
            // Dimming the shutter while it fires, rather than swapping in a
            // second grey, keeps the button one colour in every theme. The
            // old grey was a fourth hardcoded value with no token behind it.
            opacity: shooting ? 0.5 : 1,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import photo from library"
          disabled={importing}
          onPress={() => void importPhoto()}
          hitSlop={12}
          style={{ marginTop: 20, opacity: importing ? 0.5 : 1 }}
        >
          <Text variant="label" color={theme.colors.onCameraGround}>
            {importing ? 'OPENING LIBRARY...' : 'IMPORT FROM LIBRARY'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Centered({ message }: { message: string }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.background,
      }}
    >
      <Text variant="body" tone="muted">
        {message}
      </Text>
    </View>
  );
}

/** Flattens the live snapshot into the immutable copy stored on the report. */
export function toCapturedConditions(
  snapshot: WeatherSnapshot | undefined,
): CapturedConditions | null {
  if (!snapshot) return null;
  const current = snapshot.current;

  return {
    temperatureC: current.temperatureC,
    windSpeedKmh: current.windSpeedKmh,
    windGustKmh: current.windGustKmh,
    windDirectionDeg: current.windDirectionDeg,
    pressureHpa: current.pressureHpa,
    humidityPct: current.humidityPct,
    precipitationMm: current.precipitationMm,
    conditionLabel: current.condition.label,
    conditionCode: current.condition.code,
    capeJkg: current.convective.capeJkg,
    chaseScore: current.chase.score,
  };
}
