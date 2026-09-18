import '../global.css';

import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
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
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
    // Display faces. Which one is used is a theme decision, so both load up
    // front: switching theme must not wait on a font.
    BricolageGrotesque_200ExtraLight,
    BricolageGrotesque_800ExtraBold,
    ArchivoBlack_400Regular,
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
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: queryPersister,
              maxAge: PERSIST_MAX_AGE_MS,
            }}
          >
            <AppStack />
          </PersistQueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { theme } = useAppTheme();
  const { colors, type } = theme;

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
      </Stack>
    </>
  );
}
