import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';

import { eraseAccount } from '@/core/account';
import { Wordmark } from '@/core/brand';
import { onboardingGate } from '@/core/onboarding/onboardingGate';
import { MAX_CHASER_NAME_LENGTH, useProfile } from '@/core/profile';
import { ThemeCard } from '@/core/theme/ThemeCard';
import { AUTO_PREFERENCE, type ThemePreference } from '@/core/theme/themeStore';
import { SELECTABLE_THEME_NAMES } from '@/core/theme/themes';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Screen, Text, Volt } from '@/core/ui';

export default function ProfileScreen() {
  const { theme, themeName, setTheme, followSystem, isExplicit, preference, isAwaitingPosition } =
    useAppTheme();
  const { profile, ready, setName, clear } = useProfile();
  const router = useRouter();
  const [erasing, setErasing] = useState(false);

  async function erase() {
    setErasing(true);
    const result = await eraseAccount();

    // In-memory state is reset whether or not every key came off disk: what is
    // still on screen after this is the one thing the chaser can see.
    clear();
    followSystem();
    await onboardingGate.refresh();
    setErasing(false);

    if (!result.ok) {
      Alert.alert(
        'Some of it is still here',
        'Your data could not be fully removed from this phone. Try again, or delete the app to be sure.',
      );
      return;
    }

    router.replace('/onboarding');
  }

  function confirmErase() {
    Alert.alert(
      'Delete your account?',
      'Your call sign, every storm in your field log and its photographs are removed from this phone. Storm Chaser keeps no copy anywhere else, so this cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => void erase() },
      ],
    );
  }

  function choose(next: ThemePreference) {
    setTheme(next);
    void Haptics.selectionAsync();
  }

  const isAuto = preference === AUTO_PREFERENCE;
  const greeting = profile.name ? `Chaser ${profile.name}` : 'Unnamed chaser';

  return (
    <Screen edgeToEdge>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {/*
          Volt leads, because the profile is the one screen that is about the
          person rather than the sky. He is drawn from the active theme, so he
          is also the first thing to repaint when a theme is chosen below.
        */}
        <View style={{ alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Volt size={128} mood={profile.name ? 'logged' : 'idle'} />
          <Wordmark size={22} align="center" animated={false} />
          <Text variant="label" tone="muted">
            {greeting}
          </Text>
        </View>

        <Panel tone="call-sign" label="Call sign">
          {/*
            Mounted only once the stored profile has been read, so the field
            seeds itself from the saved name instead of being reset under
            whoever is already typing into it.
          */}
          {ready ? (
            <NameField initialName={profile.name ?? ''} onChange={setName} />
          ) : (
            <Text variant="body" tone="muted" style={{ minHeight: 44 }}>
              Reading your profile...
            </Text>
          )}
          <Text variant="label" tone="muted" style={{ marginTop: 8 }}>
            Signs your field log. It stays on this phone.
          </Text>
        </Panel>

        <Text variant="body" tone="muted" style={{ marginTop: 4, marginBottom: 4 }}>
          Every screen follows the theme you pick here, including Volt above, the
          map and the severity colours.
        </Text>

        <View style={{ gap: 12 }}>
          {/*
            Skyward is one card, not two.

            Day and night are the same theme seen at two times of day, and
            which one is right is a fact about where the phone is standing
            rather than a preference. Offering them as separate options let a
            chaser pick "day" at midnight, which does not make it day -- it
            makes the app wrong about the sky it claims to be reading. So the
            card previews whichever half is currently correct and hands the
            choice to the sun.
          */}
          <ThemeCard
            name={themeName === 'skyward-night' ? 'skyward-night' : 'skyward-day'}
            description="Follows the sky where you are. Turns over at sunrise and sunset on its own."
            selected={isAuto}
            onPress={() => choose(AUTO_PREFERENCE)}
          />

          {SELECTABLE_THEME_NAMES.map((name) => (
            <ThemeCard
              key={name}
              name={name}
              selected={!isAuto && themeName === name}
              onPress={() => choose(name)}
            />
          ))}
        </View>

        <Panel tone="following" label="Following" style={{ marginTop: 4 }}>
          <Text variant="body">
            {isAuto
              ? isAwaitingPosition
                ? 'Following the sky. Until a position fix arrives it follows your phone light and dark setting instead.'
                : `Following the sky where you are standing. It is ${theme.label} there now, and it turns over at sunrise and sunset on its own.`
              : isExplicit
                ? `You chose ${theme.label}. It stays put until you change it, even when your phone switches to dark mode.`
                : 'Following your phone light and dark setting. Picking a theme above overrides that.'}
          </Text>

          {isExplicit ? (
            <Button
              title="Follow my phone instead"
              tone="secondary"
              onPress={followSystem}
              style={{ marginTop: 16 }}
            />
          ) : null}
        </Panel>

        {/*
          Last on the screen, and the only destructive control in the app that
          is not attached to a single record. There is no server account to
          close: this is the phone forgetting the chaser entirely, which is
          what the confirmation says in as many words.
        */}
        <Panel tone="account-actions" label="Account" style={{ marginTop: 4 }}>
          <Text variant="body">
            Everything Storm Chaser knows about you is on this phone. Deleting your
            account erases your call sign, your whole field log and its photos.
          </Text>

          <Button
            title="Delete my account"
            tone="danger"
            loading={erasing}
            onPress={confirmErase}
            style={{ marginTop: 16 }}
          />
        </Panel>
      </ScrollView>
    </Screen>
  );
}

/**
 * The name field owns its own draft.
 *
 * Every keystroke is written through to the store, which is what makes the
 * greeting above and the field log signature update as you type; the draft
 * exists so the field never waits on that write.
 */
function NameField({
  initialName,
  onChange,
}: {
  initialName: string;
  onChange: (name: string) => void;
}) {
  const { theme } = useAppTheme();
  const [draft, setDraft] = useState(initialName);

  return (
    <TextInput
      value={draft}
      onChangeText={(value) => {
        setDraft(value);
        onChange(value);
      }}
      placeholder="Your name"
      placeholderTextColor={theme.colors.textMuted}
      maxLength={MAX_CHASER_NAME_LENGTH}
      autoCapitalize="words"
      autoCorrect={false}
      returnKeyType="done"
      accessibilityLabel="Your name"
      style={{
        minHeight: 44,
        fontFamily: theme.type.body,
        fontSize: 17,
        lineHeight: 24,
        color: theme.colors.text,
      }}
    />
  );
}
