import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import type { WeatherIconName } from '@/core/icons/names';
import type { ThemeGlass } from '@/core/theme/themes';
import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

/**
 * Big enough to be a mark rather than a bullet.
 *
 * Meteocons are drawn as illustrations -- a cloud with a bolt coming out of it
 * has real detail in it -- and at the 16px a label row would normally give an
 * icon they turn to mush. This is the one size every panel head uses, so the
 * cards line up down a scroll.
 */
const PANEL_ICON = 34;

export interface PanelProps extends ViewProps {
  label?: string;
  /**
   * A mark for the label row. Decoration: the label beside it already says
   * what the panel is, so the icon is hidden from the screen reader rather
   * than announced as a second, wordless copy of the heading.
   */
  icon?: WeatherIconName;
  accessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single surface primitive. Every card in the app is a Panel, so corner
 * radius, border treatment and elevation stay identical across screens and
 * change together when the theme changes.
 *
 * Elevation is a theme decision, not a per-card one: Skyward Day lifts with a
 * soft shadow, Skyward Night with a faint glow, Field Card with a hard offset
 * block shadow and a 3px outline.
 *
 * So is frost. On Skyward the panel is a pane of glass in front of the sky --
 * `theme.glass` says so and this is the one place it is drawn, which is what
 * keeps a hundred cards from each inventing their own translucency. The other
 * two themes declare the frost off and fall through to the opaque surface.
 *
 * There is no real backdrop blur here, and that is deliberate rather than a
 * shortcut: a Gaussian blur of everything behind the card costs a full-screen
 * readback per frame, and this app already has weather animating under every
 * panel on the screen. What actually sells glass at this scale is not the blur
 * -- it is the edges. So the budget goes into three cheap layers instead: a
 * raking sheen from the top, a lit rim along the top edge and a shaded one
 * along the bottom. Those give the pane thickness and a light source, which is
 * what the eye is reading when it calls something glass.
 */
export function Panel({ label, icon, accessory, style, children, ...rest }: PanelProps) {
  const { theme } = useAppTheme();
  const { colors, glass } = theme;

  const elevation: ViewStyle =
    theme.elevation === 'hard'
      ? {
          shadowColor: colors.border,
          shadowOpacity: 1,
          shadowOffset: { width: 4, height: 4 },
          shadowRadius: 0,
          elevation: 0,
        }
      : theme.elevation === 'glow'
        ? {
            shadowColor: colors.tier.extreme,
            shadowOpacity: 0.28,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 16,
            elevation: 0,
          }
        : {
            shadowColor: '#14213A',
            shadowOpacity: 0.14,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 18,
            elevation: 3,
          };

  const radius = theme.radius.panel;

  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor: glass.enabled ? glass.fill : colors.surface,
          // Skyward Day carries `borderWidth: 0`, which leaves a frosted pane
          // with no edge at all. Frost needs one, so the glass themes are
          // floored at a hairline and take the lit rim as their border colour
          // -- the token itself is left alone, because every other component
          // reading it still wants the answer it has always had.
          borderWidth: glass.enabled
            ? Math.max(theme.borderWidth, StyleSheet.hairlineWidth)
            : theme.borderWidth,
          borderColor: glass.enabled ? glass.rim : colors.border,
          padding: 16,
        },
        elevation,
        style,
      ]}
      {...rest}
    >
      {glass.enabled ? <GlassSurface radius={radius} glass={glass} /> : null}
      {(label || icon || accessory) && (
        <View
          style={{
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          {icon ? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <WeatherIcon name={icon} size={PANEL_ICON} />
            </View>
          ) : null}
          {label ? <Text variant="label" style={{ flex: 1 }}>{label}</Text> : <View style={{ flex: 1 }} />}
          {accessory}
        </View>
      )}
      {children}
    </View>
  );
}

/**
 * The three layers that make the fill read as a pane rather than as opacity.
 *
 * Absolutely positioned and pointer-transparent, and rendered before the
 * panel's children so every one of them paints on top without needing a
 * z-index. The clip lives on this view rather than on the Panel because
 * `overflow: 'hidden'` cancels the Android elevation shadow, and the shadow is
 * how three of the four themes separate a card from the sky.
 *
 * The sheen stops at 62% of the height on purpose: run to the bottom and it
 * reads as a gradient fill, which is a different material.
 */
function GlassSurface({ radius, glass }: { radius: number; glass: ThemeGlass }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <LinearGradient
        colors={[glass.sheen[0], glass.sheen[1]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '62%' }}
      />
      {/* Inset by the corner radius so the hairlines stop where the corner
          starts turning, instead of cutting a chord across it. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: radius * 0.5,
          right: radius * 0.5,
          height: StyleSheet.hairlineWidth,
          backgroundColor: glass.rim,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: radius * 0.5,
          right: radius * 0.5,
          height: StyleSheet.hairlineWidth,
          backgroundColor: glass.shade,
        }}
      />
    </View>
  );
}
