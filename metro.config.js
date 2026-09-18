const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

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

module.exports = withNativeWind(config, { input: './global.css' });
