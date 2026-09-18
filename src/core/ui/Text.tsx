import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'caption'
  | 'label'
  | 'readout';

const VARIANTS: Record<Variant, string> = {
  // Display and title carry the app voice: tight, condensed, confident.
  display: 'font-bold text-[34px] leading-[38px] text-ink-800 dark:text-bone-50',
  title: 'font-semibold text-[20px] leading-[26px] text-ink-800 dark:text-bone-50',
  heading: 'font-semibold text-[15px] leading-[20px] text-ink-800 dark:text-bone-50',
  body: 'font-sans text-[15px] leading-[22px] text-ink-600 dark:text-bone-200',
  caption: 'font-sans text-[13px] leading-[18px] text-ink-500 dark:text-bone-300',
  // Instrument labels: uppercase, letterspaced, deliberately small.
  label: 'font-mono text-[10px] leading-[14px] tracking-[1.6px] uppercase text-ink-500 dark:text-bone-300',
  // Numeric readouts are always mono so columns of figures line up.
  readout: 'font-monoBold text-[22px] leading-[26px] text-ink-800 dark:text-bone-50',
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  className?: string;
}

export function Text({ variant = 'body', className = '', ...rest }: TextProps) {
  return <RNText className={`${VARIANTS[variant]} ${className}`} {...rest} />;
}
