import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Wordmark } from '@/core/brand';
import { MAX_CHASER_NAME_LENGTH, useProfile } from '@/core/profile';
import { ThemeCard } from '@/core/theme/ThemeCard';
import { AUTO_PREFERENCE, type ThemePreference } from '@/core/theme/themeStore';
import { THEME_NAMES } from '@/core/theme/themes';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Screen, Text, Volt } from '@/core/ui';

export default function ProfileScreen() {
  const { theme, themeName, setTheme, followSystem, isExplicit, preference, isAwaitingPosition } =
    useAppTheme();
  const { profile, ready, setName } = useProfile();

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

        <Panel label="Call sign">
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
          {THEME_NAMES.map((name) => (
            <ThemeCard
              key={name}
              name={name}
              selected={!isAuto && themeName === name}
              onPress={() => choose(name)}
            />
          ))}
        </View>

        {/*
          Auto is a preference, not a fourth theme, so it sits apart from the
          cards rather than beside them: picking it does not pin a look, it
          hands the choice to the sun over wherever the phone is standing.
        */}
        <Button
          title={isAuto ? `Following the sky — ${theme.label}` : 'Follow the sky where I am'}
          tone={isAuto ? 'primary' : 'secondary'}
          onPress={() => choose(AUTO_PREFERENCE)}
          style={{ marginTop: 4 }}
        />

        <Panel label="Following" style={{ marginTop: 4 }}>
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
