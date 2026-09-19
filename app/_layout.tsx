import '../global.css';

import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  BigShouldersDisplay_300Light,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import {
  BricolageGrotesque_200ExtraLight,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
  useFonts,
} from '@expo-google-fonts/instrument-sans';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { onboardingStore } from '@/core/onboarding/onboardingStore';
import { ProfileProvider } from '@/core/profile';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { useAppTheme } from '@/core/theme/useAppTheme';
import {
  PERSIST_MAX_AGE_MS,
  queryClient,
  queryPersister,
} from '@/services/query/queryClient';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    // The three display faces. Which one is used is a theme decision, so all
    // three load up front: switching theme must not wait on a font. Anton is
    // one weight by design and so appears once; the other two carry a real
    // light and a real heavy.
    BricolageGrotesque_200ExtraLight,
    BricolageGrotesque_800ExtraBold,
    Anton_400Regular,
    BigShouldersDisplay_300Light,
    BigShouldersDisplay_900Black,
  });

  // A font failure should degrade to system faces, never block the app.
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ProfileProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister: queryPersister,
                maxAge: PERSIST_MAX_AGE_MS,
              }}
            >
              <AppStack />
            </PersistQueryClientProvider>
          </ProfileProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const router = useRouter();
  const { theme, ready } = useAppTheme();
  const { colors, type } = theme;
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  /**
   * First launch goes through the welcome flow. Waits for the theme to load so
   * onboarding never paints in one theme and then snaps to another, and a
   * storage failure falls through to the app rather than trapping someone in
   * onboarding forever.
   */
  useEffect(() => {
    if (!ready || checkedOnboarding) return;

    let cancelled = false;

    void (async () => {
      const result = await onboardingStore.hasCompleted();
      if (cancelled) return;

      setCheckedOnboarding(true);
      if (result.ok && !result.value) router.replace('/onboarding');
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, checkedOnboarding, router]);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: type.display, fontSize: 20 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="capture"
          options={{ presentation: 'modal', title: 'Document a storm' }}
        />
        <Stack.Screen name="storm/[id]" options={{ title: 'Storm report' }} />
        <Stack.Screen name="legend/[id]" options={{ title: 'Storm lore' }} />
        <Stack.Screen
          name="profile"
          options={{ presentation: 'modal', title: 'Profile' }}
        />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
