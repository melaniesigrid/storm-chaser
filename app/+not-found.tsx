import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/core/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Off the map' }} />
      <View className="flex-1 items-center justify-center bg-bone-50 p-6 dark:bg-ink-800">
        <Text variant="title" className="mb-2">
          That screen does not exist
        </Text>
        <Link href="/">
          <Text variant="caption" className="text-lightning">
            Back to conditions
          </Text>
        </Link>
      </View>
    </>
  );
}
