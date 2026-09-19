import { LinearGradient } from 'expo-linear-gradient';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NightMoon } from '@/core/sky/NightMoon';
import { useAppTheme } from '@/core/theme/useAppTheme';

import { Starfield } from './Starfield';

export interface ScreenProps extends ViewProps {
  /** Applies top inset. Disable on screens inside a native header. */
  edgeToEdge?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Every screen's ground.
 *
 * Skyward paints a four-stop vertical gradient, which is most of why it reads
 * as sky rather than as a page: the third stop is the haze band at the
 * horizon, and it is what keeps the wash from looking like a CSS demo. Field
 * Card repeats one value, so the same component renders flat without branching
 * at the call site.
 */
export function Screen({ edgeToEdge = false, style, children, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        locations={theme.colors.backgroundGradientLocations}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Above the gradient, below everything else. Both render nothing at
          all in the daylight themes. The moon is drawn at its real phase, so
          on the nights around new there is correctly nothing up there. */}
      <Starfield />
      <NightMoon />
      <View
        style={[{ flex: 1 }, edgeToEdge ? null : { paddingTop: insets.top }, style]}
        {...rest}
      >
        {children}
      </View>
    </View>
  );
}
