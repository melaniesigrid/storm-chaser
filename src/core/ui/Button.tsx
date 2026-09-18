import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { Text } from './Text';

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger';

const TONES: Record<Tone, { container: string; label: string }> = {
  primary: {
    container: 'bg-lightning active:opacity-80',
    label: 'text-ink-900',
  },
  secondary: {
    container:
      'bg-transparent border border-ink-400 active:opacity-70 dark:border-ink-400',
    label: 'text-ink-800 dark:text-bone-50',
  },
  ghost: {
    container: 'bg-transparent active:opacity-60',
    label: 'text-ink-500 dark:text-bone-300',
  },
  danger: {
    container: 'bg-supercell active:opacity-80',
    label: 'text-white',
  },
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  tone?: Tone;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Button({
  title,
  tone = 'primary',
  loading = false,
  icon,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const styles = TONES[tone];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-full px-5 ${styles.container} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text variant="heading" className={styles.label}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
