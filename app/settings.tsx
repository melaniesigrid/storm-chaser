import * as Haptics from 'expo-haptics';
import { ScrollView, View } from 'react-native';

import { Monogram, Wordmark } from '@/core/brand';
import { ThemeCard } from '@/core/theme/ThemeCard';
import { AUTO_PREFERENCE, type ThemePreference } from '@/core/theme/themeStore';
import { THEME_NAMES } from '@/core/theme/themes';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Button, Panel, Screen, Text } from '@/core/ui';

export default function SettingsScreen() {
  const { theme, themeName, setTheme, followSystem, isExplicit, preference, isAwaitingPosition } =
    useAppTheme();

  function choose(next: ThemePreference) {
    setTheme(next);
    void Haptics.selectionAsync();
  }

  const isAuto = preference === AUTO_PREFERENCE;

  return (
    <Screen edgeToEdge>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }}>
        {/*
          The screen's own title is already in the modal header, so this space
          goes to the mark instead of repeating the word. Both pieces repaint
          when a theme is chosen below, which makes the lockup the first live
          preview of the choice.
        */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <Monogram size={56} animated />
          <Wordmark size={26} align="left" animated={false} />
        </View>

        <Text variant="body" tone="muted" style={{ marginBottom: 4 }}>
          Every screen follows the theme you pick here, including the mark above, the
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
