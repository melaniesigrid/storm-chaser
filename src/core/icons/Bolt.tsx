import Svg, { Path, type SvgProps } from 'react-native-svg';

/**
 * A solid lightning bolt in one colour.
 *
 * The Meteocons set already has a bolt and it could not be used here. Those
 * glyphs carry their own fills and gradients -- that is the point of them --
 * so the bolt on the primary button was a yellow bolt sitting on the yellow
 * accent that Broadcast and Field Card both use, which is close to invisible
 * and reads as a rendering fault rather than as an icon.
 *
 * This one takes a colour, so the caller can hand it the same ink the button
 * uses for its label and the two cannot drift apart.
 *
 * Deliberately one path and no gradient: at 44px on a button it is a
 * silhouette, and a silhouette is what survives being looked at quickly in
 * bad light, which is the condition this app is used in.
 */
export interface BoltProps extends Omit<SvgProps, 'width' | 'height' | 'color'> {
  size?: number;
  /** Any colour. Callers on a filled button should pass its label ink. */
  color: string;
}

export function Bolt({ size = 44, color, ...rest }: BoltProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path d="M14.2 1.2 4.6 13.9h5.4l-1.6 8.9L19.4 10.1h-5.4z" fill={color} />
    </Svg>
  );
}
