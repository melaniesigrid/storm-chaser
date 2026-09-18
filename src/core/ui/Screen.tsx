import { LinearGradient } from 'expo-linear-gradient';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/core/theme/useAppTheme';

export interface ScreenProps extends ViewProps {
  /** Applies top inset. Disable on screens inside a native header. */
  edgeToEdge?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Every screen's ground.
 *
 * Skyward paints a three-stop vertical gradient, which is most of why it reads
 * as sky rather than as a page; Field Card repeats one value, so the same
 * component renders flat without branching at the call site.
 */
export function Screen({ edgeToEdge = false, style, children, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={[{ flex: 1 }, edgeToEdge ? null : { paddingTop: insets.top }, style]}
        {...rest}
      >
        {children}
      </View>
    </View>
  );
}
