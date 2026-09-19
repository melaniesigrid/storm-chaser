import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { WeatherIcon } from '@/core/icons/WeatherIcon';
import type { WeatherIconName } from '@/core/icons/names';
import { cardTint } from '@/core/theme/cardTint';
import { compositeHex } from '@/core/theme/contrast';
import type { ThemeGlass, ThemeSurface } from '@/core/theme/themes';
import { useAppTheme } from '@/core/theme/useAppTheme';

import { Text } from './Text';

/**
 * What the panels on this screen are drawn on.
 *
 * A screen opts in; the theme decides whether the opt-in means anything. Both
 * halves are needed. The screen knows whether its background is worth showing
 * -- Conditions is the one that paints live weather behind everything and then
 * covered it with a column of cards -- and the theme knows whether it HAS a
 * background rather than a flat fill, which Broadcast and Field Card do not.
 *
 * Context rather than a prop because the blocks on that screen are five
 * different components, each rendering its own Panel. Threading a boolean
 * through all five is the version of this that goes stale the first time a
 * sixth is added.
 */
const PanelSurfaceContext = createContext<ThemeSurface>('card');

export function PanelSurface({ value, children }: { value: ThemeSurface; children: ReactNode }) {
  return <PanelSurfaceContext.Provider value={value}>{children}</PanelSurfaceContext.Provider>;
}

/**
 * For the pieces inside a panel that were drawn to sit on a card: the sunken
 * disc behind an instrument glyph, the track behind a meter. Cream on white is
 * a subtle inset; cream on a blue sky is a leftover.
 */
export function usePanelSurface(): ThemeSurface {
  return useContext(PanelSurfaceContext);
}

/**
 * What the panel this component is inside of was actually painted with.
 *
 * `theme.colors.surface` was the answer for as long as every card in a theme
 * was the same colour. Field Card broke that: a panel with a `tone` is printed
 * on its own stock, and the pieces drawn inside it -- a meter track, a sunken
 * disc -- have to be mixed against THAT, not against a white the card no
 * longer is. A cream track on lilac stock is the same bug as a cream disc on a
 * blue sky, one theme along.
 *
 * `sunken` is the stock with the theme's ink washed over it rather than a
 * fixed token, so it darkens whatever it happens to be sitting on and stays a
 * recess in all twelve stocks. Untinted panels keep `surfaceSunken` exactly,
 * so nothing outside Field Card moves.
 */
export interface PanelStock {
  /** The fill the panel drew, tint included. */
  stock: string;
  /** A recess cut into that fill. */
  sunken: string;
}

const PanelStockContext = createContext<PanelStock | null>(null);

export function usePanelStock(): PanelStock {
  const { theme } = useAppTheme();
  return (
    useContext(PanelStockContext) ?? {
      stock: theme.colors.surface,
      sunken: theme.colors.surfaceSunken,
    }
  );
}

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
   * A stable name for this card, used to pick its stock from
   * `theme.colors.cardTints`.
   *
   * A name rather than an index, for the same reason a report's stock comes
   * from its id: the Conditions column is assembled conditionally, and an
   * index would repaint every card below a banner the moment the banner
   * appeared. `tone="chase-index"` is the chase index's colour forever.
   *
   * Only themes that publish a tint palette act on it -- Field Card, whose
   * argument is that these are collected cards and not one long white sheet.
   * Everywhere else it resolves to `surface` and the prop costs nothing.
   */
  tone?: string;
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
export function Panel({ label, icon, accessory, tone, style, children, ...rest }: PanelProps) {
  const { theme } = useAppTheme();
  const { colors, glass } = theme;

  /**
   * On the ground the panel keeps its padding, its label row and its place in
   * the column, and gives up everything that made it a surface: fill, edge,
   * frost and shadow. What separates one block from the next is then the space
   * between them and the sky showing through, which is the whole point -- a
   * cloud drawn in white and #E6EFFC has somewhere to be.
   */
  const onGround = useContext(PanelSurfaceContext) === 'sky';

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

  /**
   * Frost first: a translucent pane takes its colour from the sky behind it,
   * and printing it on card stock would make it neither.
   */
  const stock = glass.enabled
    ? colors.surface
    : (tone ? cardTint(tone, colors.cardTints) : undefined) ?? colors.surface;

  const stockContext: PanelStock = {
    stock,
    sunken:
      stock === colors.surface
        ? colors.surfaceSunken
        : compositeHex(colors.border, stock, 0.12),
  };

  if (onGround) {
    return (
      <View style={[{ padding: 16 }, style]} {...rest}>
        <PanelHead label={label} icon={icon} accessory={accessory} />
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor: glass.enabled ? glass.fill : stock,
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
      <PanelStockContext.Provider value={stockContext}>
        <PanelHead label={label} icon={icon} accessory={accessory} />
        {children}
      </PanelStockContext.Provider>
    </View>
  );
}

/** The label row, shared by both materials so it cannot drift between them. */
function PanelHead({ label, icon, accessory }: Pick<PanelProps, 'label' | 'icon' | 'accessory'>) {
  if (!label && !icon && !accessory) return null;

  return (
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
      {label ? (
        <Text variant="label" style={{ flex: 1 }}>
          {label}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {accessory}
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
