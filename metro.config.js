const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const { withMapsWebShim } = require('./metro.maps-web');

const config = getDefaultConfig(__dirname);

/**
 * Let `import Icon from '...svg'` resolve to a React component instead of an
 * asset URI. Meteocons ships plain SVG, and react-native-svg renders it
 * natively, so the weather glyphs stay vector at every size and can take a
 * colour prop from the active theme.
 */
const { assetExts, sourceExts } = config.resolver;
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg'];

/**
 * The web bundle cannot import `react-native-maps` (see metro.maps-web.js for
 * why). Point it at a stand-in that renders a "runs on device" surface, so the
 * rest of the Map screen -- legend, counts, lore toggle, the onboarding call to
 * action -- still works in the browser. iOS and Android are untouched.
 */
config.resolver.resolveRequest = withMapsWebShim(config.resolver.resolveRequest);

module.exports = withNativeWind(config, { input: './global.css' });
