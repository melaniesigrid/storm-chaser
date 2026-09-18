import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { onboardingStore } from '@/core/onboarding/onboardingStore';
import { ThemeCard } from '@/core/theme/ThemeCard';
import { THEME_NAMES, type ThemeName } from '@/core/theme/themes';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Screen, Text, Volt } from '@/core/ui';
import { useDeviceLocation } from '@/features/location/useDeviceLocation';

type Step = 0 | 1 | 2;

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme, themeName, setTheme } = useAppTheme();
  const location = useDeviceLocation();
  const [step, setStep] = useState<Step>(0);

  function advance(next: Step) {
    void Haptics.selectionAsync();
    setStep(next);
  }

  async function finish() {
    await onboardingStore.complete();
    router.replace('/');
  }

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 12 }}>
        {step === 0 ? <Welcome /> : null}
        {step === 1 ? <Locate /> : null}
        {step === 2 ? (
          <PickTheme active={themeName} onPick={(name) => setTheme(name)} />
        ) : null}

        <View style={{ marginTop: 'auto', gap: 12 }}>
          {step === 0 ? <Button title="Get started" onPress={() => advance(1)} /> : null}

          {step === 1 ? (
            <>
              <Button
                title="Use my location"
                onPress={() => {
                  void location.refresh();
                  advance(2);
                }}
              />
              <Button title="Not now" tone="ghost" onPress={() => advance(2)} />
            </>
          ) : null}

          {step === 2 ? <Button title="Start chasing" onPress={() => void finish()} /> : null}

          <Dots step={step} color={theme.colors.text} />
        </View>
      </View>
    </Screen>
  );
}

function Welcome() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 36 }}>
      <Volt size={132} mood="idle" />

      <Text variant="display" style={{ marginTop: 34, textAlign: 'center', fontSize: 48, lineHeight: 50 }}>
        Storm Chaser
      </Text>
      <Text variant="body" tone="muted" style={{ marginTop: 14, textAlign: 'center', fontSize: 19, lineHeight: 27 }}>
        Read the sky where you stand. Log the storms worth remembering.
      </Text>
    </View>
  );
}

function Locate() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 36 }}>
      <Volt size={124} mood="alert" />

      <Text variant="display" style={{ marginTop: 32, textAlign: 'center' }}>
        Where are you standing?
      </Text>
      <Text variant="body" tone="muted" style={{ marginTop: 14, textAlign: 'center' }}>
        Conditions come from your exact position. Nothing leaves the device, and every
        report you log keeps its own weather stamp.
      </Text>
    </View>
  );
}

function PickTheme({
  active,
  onPick,
}: {
  active: ThemeName;
  onPick: (name: ThemeName) => void;
}) {
  return (
    <View style={{ paddingTop: 16 }}>
      <Text variant="display">Make it yours</Text>
      <Text variant="body" tone="muted" style={{ marginTop: 8, marginBottom: 18 }}>
        Change it any time in Settings.
      </Text>

      <View style={{ gap: 12 }}>
        {THEME_NAMES.map((name) => (
          <ThemeCard
            key={name}
            name={name}
            selected={active === name}
            onPress={() => {
              onPick(name);
              void Haptics.selectionAsync();
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Dots({ step, color }: { step: Step; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 7, justifyContent: 'center', paddingTop: 4 }}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={{
            width: index === step ? 26 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity: index === step ? 1 : 0.32,
          }}
        />
      ))}
    </View>
  );
}
