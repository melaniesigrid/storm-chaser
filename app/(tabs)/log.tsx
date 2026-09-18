import { useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { EmptyState, Panel, Skeleton, Text } from '@/core/ui';
import { StormCard } from '@/features/storms/components/StormCard';
import { useStormReports } from '@/features/storms/hooks/useStormLog';

export default function FieldLogScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useStormReports();

  if (isLoading) {
    return (
      <View className="flex-1 bg-bone-50 p-4 dark:bg-ink-800">
        {[0, 1, 2].map((key) => (
          <Panel key={key} className="mb-3">
            <Skeleton height={72} />
          </Panel>
        ))}
      </View>
    );
  }

  const reports = data ?? [];

  return (
    <View className="flex-1 bg-bone-50 dark:bg-ink-800">
      <FlatList
        data={reports}
        keyExtractor={(report) => report.id}
        contentContainerClassName="p-4 pb-28"
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          reports.length ? (
            <Text variant="label" className="mb-3">
              {`${reports.length} report${reports.length === 1 ? '' : 's'} on this device`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            glyph="⚡"
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
          className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-lightning active:opacity-80"
        >
          <Text className="text-[26px] leading-[28px] text-ink-900">+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
