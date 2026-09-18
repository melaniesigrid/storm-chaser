import { View, type ViewProps } from 'react-native';

import { Text } from './Text';

export interface PanelProps extends ViewProps {
  label?: string;
  accessory?: React.ReactNode;
  className?: string;
}

/**
 * The single surface primitive. Every card in the app is a Panel so corner
 * radius, border treatment and padding stay identical across screens.
 */
export function Panel({
  label,
  accessory,
  className = '',
  children,
  ...rest
}: PanelProps) {
  return (
    <View
      className={`rounded-panel border border-bone-200 bg-white p-4 dark:border-ink-500 dark:bg-ink-700 ${className}`}
      {...rest}
    >
      {(label || accessory) && (
        <View className="mb-3 flex-row items-center justify-between">
          {label ? <Text variant="label">{label}</Text> : <View />}
          {accessory}
        </View>
      )}
      {children}
    </View>
  );
}
