import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Wordmark } from '@/core/brand';
import { onboardingGate } from '@/core/onboarding/onboardingGate';
import { onboardingStore } from '@/core/onboarding/onboardingStore';
import { ThemeCard } from '@/core/theme/ThemeCard';
import { AUTO_PREFERENCE, type ThemePreference } from '@/core/theme/themeStore';
import { SELECTABLE_THEME_NAMES } from '@/core/theme/themes';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Screen, StatusBanner, Text, Volt } from '@/core/ui';
import type { AppError } from '@/core/utils/result';
import {
  useDeviceLocation,
  type LocationStatus,
} from '@/features/location/useDeviceLocation';

type Step = 0 | 1 | 2;

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme, themeName, setTheme, preference } = useAppTheme();
  // `auto: false` is the fix for the defect this screen used to only describe:
  // the OS dialog now waits for the button below rather than firing from a
  // mount, which on first launch happened over the step-0 welcome copy.
  const location = useDeviceLocation({ auto: false });
  const [step, setStep] = useState<Step>(0);

  // Once the permission has been answered there is nothing left to press, so
  // the primer turns into its own result and a single way forward.
  const answered =
    location.status === 'ready' ||
    location.status === 'denied' ||
    location.status === 'error';

  function advance(next: Step) {
    void Haptics.selectionAsync();
    setStep(next);
  }

  async function finish() {
    await onboardingStore.complete();
    // Refresh before navigating: the Conditions tab reads the gate to decide
    // whether it may acquire a fix on its own, and it is entitled to from the
    // moment this flow is over.
    await onboardingGate.refresh();
    router.replace('/');
  }

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 12 }}>
        {step === 0 ? <Welcome /> : null}
        {step === 1 ? <Locate status={location.status} error={location.error} /> : null}
        {step === 2 ? (
          <PickTheme active={preference ?? themeName} onPick={(next) => setTheme(next)} />
        ) : null}

        <View style={{ marginTop: 'auto', gap: 12 }}>
          {step === 0 ? <Button title="Get started" onPress={() => advance(1)} /> : null}

          {step === 1 && answered ? <Button title="Continue" onPress={() => advance(2)} /> : null}

          {step === 1 && !answered ? (
            <>
              <Button
                title="Use my location"
                loading={location.status === 'requesting'}
                onPress={() => void location.refresh()}
              />
              {/* Skips without asking. The app is usable without a fix, since every
                  screen already renders a position-unknown state, and asking
                  anyway would make this button a lie. */}
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

/**
 * The only place the full wordmark gets to be the size it was drawn at. Volt
 * sits above it rather than beside it so the lockup keeps its own baseline.
 */
function Welcome() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 36 }}>
      <Volt size={132} mood="idle" />

      <Wordmark size={56} style={{ marginTop: 34 }} />

      <Text
        variant="body"
        tone="muted"
        style={{ marginTop: 22, textAlign: 'center', fontSize: 19, lineHeight: 27 }}
      >
        Read the sky where you stand. Log the storms worth remembering.
      </Text>
    </View>
  );
}

function Locate({ status, error }: { status: LocationStatus; error: AppError | null }) {
  const { theme } = useAppTheme();

  return (
    <View style={{ alignItems: 'center', paddingTop: 36 }}>
      <Ping>
        <Volt size={124} mood="alert" />
      </Ping>

      <Text variant="display" style={{ marginTop: 32, textAlign: 'center' }}>
        Where are you standing?
      </Text>
      <Text variant="body" tone="muted" style={{ marginTop: 14, textAlign: 'center' }}>
        Conditions come from your exact position. Nothing leaves the device, and every
        report you log keeps its own weather stamp.
      </Text>

      {status === 'ready' ? (
        <Text
          variant="message"
          color={theme.colors.tierText.active}
          style={{ marginTop: 18, textAlign: 'center' }}
        >
          Got it. Conditions will come from where you are standing.
        </Text>
      ) : null}

      {(status === 'denied' || status === 'error') && error ? (
        <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
          <StatusBanner tone="alert" message={error.message} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Two rings expanding out of whatever sits inside, half a cycle apart. This is
 * the screen that explains why the app wants a position.
 */
function Ping({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ring delay={0} />
      <Ring delay={800} />
      {children}
    </View>
  );
}

function Ring({ delay }: { delay: number }) {
  const { theme } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    grow.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false),
    );
    return () => cancelAnimation(grow);
  }, [delay, grow, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - grow.value) * 0.7,
    transform: [{ scale: 0.6 + grow.value * 1.6 }],
  }));

  // Reduce Motion drops the rings entirely rather than freezing them mid
  // expansion, which would read as a stray outline around Volt.
  if (reduceMotion) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 112,
          height: 112,
          borderRadius: 56,
          borderWidth: 3,
          borderColor: theme.colors.tier.severe,
        },
        style,
      ]}
    />
  );
}

/**
 * The theme step.
 *
 * `active` is the PREFERENCE, not the resolved theme name, which is the whole
 * reason auto can be offered here at all: this screen used to write a fixed
 * theme name the moment anything was tapped, and a stored name is what the
 * provider reads as "the user has decided, stop following anything". Offering
 * auto while writing a name would have shipped the feature dead on first run
 * for every user.
 */
function PickTheme({
  active,
  onPick,
}: {
  active: ThemePreference;
  onPick: (preference: ThemePreference) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, paddingTop: 16 }}>
      <Text variant="display">Make it yours</Text>
      <Text variant="body" tone="muted" style={{ marginTop: 8, marginBottom: 18 }}>
        Change it any time in Settings.
      </Text>

      {/*
        Scrolls, because each card is a real preview of the Conditions screen
        rather than a swatch, and four of them are taller than a phone. The
        footer buttons stay put outside this.
      */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          {/*
            Skyward leads, and it is one card rather than two.

            Day and night are the same theme at two times of day, and which
            one is correct is a fact about where the phone is standing, not a
            preference. Picking "day" at midnight does not make it day, it
            makes the app wrong about the sky it claims to be reading. So this
            card previews whichever half is currently correct and hands the
            choice to the sun. It is also the default, which is why it is
            first: the honest answer should be the one you do not have to pick.
          */}
          <ThemeCard
            name="skyward-day"
            description="Follows the sky where you are. Turns over at sunrise and sunset on its own."
            selected={active === AUTO_PREFERENCE}
            onPress={() => {
              onPick(AUTO_PREFERENCE);
              void Haptics.selectionAsync();
            }}
          />

          {SELECTABLE_THEME_NAMES.map((name) => (
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

        {/* Introduces Volt as a character before he shows up celebrating a log. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginTop: 16,
            padding: 12,
            borderRadius: theme.radius.panel - 4,
            backgroundColor: theme.colors.surface,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.border,
          }}
        >
          <Volt size={56} mood="logged" />
          <Text variant="caption" style={{ flex: 1 }}>
            Volt will cheer every time you log a storm.
          </Text>
        </View>
      </ScrollView>
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
