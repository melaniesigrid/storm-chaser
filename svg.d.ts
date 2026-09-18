/**
 * Metro turns `.svg` imports into React components (see metro.config.js).
 * TypeScript needs to be told the same thing or every icon import is an error.
 */
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
