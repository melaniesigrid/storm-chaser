import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { Bolt } from '@/core/icons/Bolt';
import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useProfile } from '@/core/profile';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Confetti, EmptyState, Panel, Skeleton, StormyCheer, Text } from '@/core/ui';
import { StormCard } from '@/features/storms/components/StormCard';
import { useStormReports } from '@/features/storms/hooks/useStormLog';

export default function FieldLogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { data, isLoading, refetch, isRefetching } = useStormReports();
  // The log is the one list that belongs to a person rather than to the sky,
  // so it carries their name when they have given one.
  const { profile } = useProfile();

  // The capture flow redirects here with ?celebrate=1 after a successful save.
  // Celebrating on the destination rather than inside the modal means the burst
  // lands over the list the new report just joined.
  const { celebrate } = useLocalSearchParams<{ celebrate?: string }>();

  /**
   * Derived from the route rather than mirrored into state.
   *
   * This used to set a `celebrating` flag inside an effect and clear the param
   * in the same pass, which is a synchronous setState in an effect: one render
   * to read the param, a second to record it, and the burst starting a frame
   * later than the screen it belongs to. The param already IS the state, so the
   * confetti reads it directly and clears it when it finishes.
   */
  const celebrating = celebrate === '1';

  useEffect(() => {
    if (!celebrating) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [celebrating]);

  // Clearing the flag is what ends the burst, so a re-render or a back
  // navigation cannot re-fire it.
  const endCelebration = useCallback(
    () => router.setParams({ celebrate: undefined }),
    [router],
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 16 }}>
        {[0, 1, 2].map((key) => (
          <Panel key={key} style={{ marginBottom: 12 }}>
            <Skeleton height={72} />
          </Panel>
        ))}
      </View>
    );
  }

  const reports = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={reports}
        keyExtractor={(report) => report.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 112 }}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          reports.length ? (
            <Text variant="label" style={{ marginBottom: 12 }}>
              {`${reports.length} report${reports.length === 1 ? '' : 's'} on this device${
                profile.name ? ` · ${profile.name}` : ''
              }`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            illustration={<WeatherIcon name="thunderstorms-day-rain" size={120} />}
            title="No storms logged yet"
            description="Photograph a storm and the app stamps it with your coordinates, the time and the conditions at that moment."
            actionLabel="Document a storm"
            onAction={() => router.push('/capture')}
          />
        }
        renderItem={({ item }) => (
          <StormCard report={item} onPress={() => router.push(`/storm/${item.id}`)} />
        )}
      />

      {reports.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Document a storm"
          onPress={() => router.push('/capture')}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 20,
            height: 60,
            width: 60,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 30,
            backgroundColor: theme.colors.accent,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.border,
          }}
        >
          {/*
            A bolt rather than a plus. A plus means "add a row"; this button
            means "go and photograph the sky", and the app already has a mark
            for that. Drawn in the button's own label ink so it cannot end up
            yellow-on-yellow the way the Meteocons glyph did.
          */}
          <Bolt size={32} color={theme.colors.onAccent} />
        </Pressable>
      ) : null}

      {/*
        Both fire together and only the confetti clears the flag. The cheer is
        the shorter of the two, so letting it call endCelebration would cut
        the burst off halfway.
      */}
      <Confetti active={celebrating} onDone={endCelebration} />
      <StormyCheer active={celebrating} />
    </View>
  );
}
