import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  /** Applies top inset. Disable on screens inside a native header. */
  edgeToEdge?: boolean;
  className?: string;
}

export function Screen({
  edgeToEdge = false,
  className = '',
  style,
  children,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[edgeToEdge ? null : { paddingTop: insets.top }, style]}
      className={`flex-1 bg-bone-50 dark:bg-ink-800 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}
