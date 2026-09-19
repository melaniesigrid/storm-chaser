/**
 * The web stand-in for `react-native-maps`.
 *
 * `react-native-maps` is native only. Its entry point re-exports every layer
 * it ships, and each of those pulls in `src/specs/NativeComponent*.ts`, which
 * call `codegenNativeComponent` from `react-native`. `react-native-web` has no
 * such export, so merely importing the package on web throws
 * `codegenNativeComponent is not a function` while the module is still being
 * evaluated -- before any component renders, which is why it white-screened the
 * Map tab rather than degrading.
 *
 * Metro aliases the package to this file for `platform === 'web'` only (see
 * metro.config.js). iOS and Android resolve the real package untouched.
 *
 * The point of the stand-in is that the rest of the Map screen still works on
 * web: the legend, the counts, the lore toggle and the "Document a storm" call
 * to action all render over a surface that says plainly the map itself needs a
 * device. A thrown error gave the reader none of that.
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';
import type { MapMarkerProps, MapViewProps } from 'react-native-maps';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import { useAppTheme } from '@/core/theme/useAppTheme';
import { Text } from '@/core/ui';

/**
 * Children are deliberately dropped. Every child of a MapView is a map layer,
 * and no layer has a meaning off a map -- rendering them would put bare marker
 * callout content in the middle of the placeholder.
 */
export default function MapView({ style }: MapViewProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surfaceSunken,
          alignItems: 'center',
          // Not centred. The Map screen floats its legend and its onboarding
          // call to action over the bottom of the map, and a centred block
          // lands underneath them -- on a phone viewport the message was
          // invisible behind the panel stack. Top-aligned, it reads in the
          // empty half of the screen at every viewport.
          justifyContent: 'flex-start',
          paddingTop: 56,
          paddingHorizontal: 24,
        },
        style,
      ]}
    >
      <WeatherIcon name="compass" size={64} />
      <Text variant="title" style={{ marginTop: 14, textAlign: 'center' }}>
        The map runs on device
      </Text>
      <Text
        variant="body"
        tone="muted"
        style={{ marginTop: 6, textAlign: 'center', maxWidth: 360 }}
      >
        Storm Chaser draws its pins with the platform map, which has no web
        build. Open the app on iOS or Android to see your reports plotted.
      </Text>
    </View>
  );
}

/** A pin with no map to sit on. Rendered for API parity, draws nothing. */
export const Marker: ComponentType<MapMarkerProps> = () => null;
export const MapMarker = Marker;

export const PROVIDER_DEFAULT = undefined;
export const PROVIDER_GOOGLE = 'google';
