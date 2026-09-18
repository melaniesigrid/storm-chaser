import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { useAppTheme } from '@/core/theme/useAppTheme';
import { Text } from '@/core/ui';

export default function NotFoundScreen() {
  const { theme } = useAppTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Off the map' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 }}>
        <Text variant="title" style={{ marginBottom: 8 }}>
          That screen does not exist
        </Text>
        <Link href="/">
          <Text variant="caption" color={theme.colors.tierText.active}>
            Back to conditions
          </Text>
        </Link>
      </View>
    </>
  );
}
