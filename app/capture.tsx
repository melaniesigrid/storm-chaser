import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Panel, Text } from '@/core/ui';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';
import {
  StormMetadataForm,
  type StormMetadataFormValues,
} from '@/features/storms/components/StormMetadataForm';
import { useCreateStormReport } from '@/features/storms/hooks/useStormLog';
import type { CapturedConditions } from '@/features/storms/model/types';
import { useWeatherSnapshot } from '@/features/weather/hooks/useWeather';
import type { WeatherSnapshot } from '@/features/weather/model/types';

type Phase = { name: 'camera' } | { name: 'metadata'; photoUri: string; capturedAt: string };

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ name: 'camera' });
  const [shooting, setShooting] = useState(false);
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
      setPhase({ name: 'metadata', photoUri: photo.uri, capturedAt: new Date().toISOString() });
    } catch {
      setErrorMessage('The camera failed to capture. Try again.');
    } finally {
      setShooting(false);
    }
  }

  function save(values: StormMetadataFormValues) {
    if (phase.name !== 'metadata') return;
    setErrorMessage(null);

    createReport.mutate(
      {
        temporaryPhotoUri: phase.photoUri,
        capturedAt: phase.capturedAt,
        coordinates: location.coordinates,
        locationAccuracyM: location.accuracyMeters,
        stormType: values.stormType,
        notes: values.notes,
        conditions: toCapturedConditions(weather.data),
      },
      {
        onSuccess: () => router.replace('/log'),
        onError: (error) =>
          setErrorMessage(
            error instanceof Error ? error.message : 'The report could not be saved.',
          ),
      },
    );
  }

  if (!permission) {
    return <Centered message="Checking camera permission..." />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center bg-bone-50 p-6 dark:bg-ink-800">
        <Panel label="Camera access">
          <Text variant="title" className="mb-2">
            Storm Chaser needs the camera
          </Text>
          <Text variant="caption" className="mb-6">
            Photographs are the core of a field report. Nothing is uploaded: images stay
            on this device unless you enable cloud sync.
          </Text>
          <Button title="Grant access" onPress={() => void requestPermission()} />
        </Panel>
      </View>
    );
  }

  if (phase.name === 'camera') {
    return (
      <View className="flex-1 bg-ink-900">
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

        <View className="absolute left-0 right-0 top-4 px-5">
          <Text variant="label" className="text-bone-100">
            {location.coordinates
              ? `FIX ACQUIRED · ${location.coordinates.latitude.toFixed(3)}, ${location.coordinates.longitude.toFixed(3)}`
              : 'NO POSITION FIX'}
          </Text>
        </View>

        <View className="absolute bottom-0 left-0 right-0 items-center pb-12">
          {errorMessage ? (
            <Text variant="caption" className="mb-3 text-supercell">
              {errorMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            disabled={shooting}
            onPress={() => void takePhoto()}
            className={`h-20 w-20 items-center justify-center rounded-full border-4 border-bone-50 ${shooting ? 'bg-ink-500' : 'bg-lightning'}`}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bone-50 dark:bg-ink-800"
      contentContainerClassName="p-4"
      keyboardShouldPersistTaps="handled"
    >
      <StormMetadataForm
        photoUri={phase.photoUri}
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

function Centered({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-bone-50 dark:bg-ink-800">
      <Text variant="caption">{message}</Text>
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
