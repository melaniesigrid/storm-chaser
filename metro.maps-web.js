const path = require('node:path');

/**
 * `react-native-maps` is native only. Its entry point re-exports every layer it
 * ships, and each layer's spec calls `codegenNativeComponent` from
 * `react-native` -- an export `react-native-web` does not have. Importing the
 * package in a web bundle therefore throws
 * `codegenNativeComponent is not a function` while the module is still being
 * evaluated, before any component renders, which white-screened the Map tab in
 * the browser instead of degrading.
 *
 * This lives outside metro.config.js so it can be unit tested: requiring
 * metro.config.js under Jest pulls in metro-config, whose Flow-typed source
 * Jest will not transform.
 */
const MAPS_WEB_SHIM = path.resolve(__dirname, 'src/core/maps/react-native-maps.web.tsx');

/**
 * Wraps a Metro `resolveRequest` so the web bundle gets the local stand-in.
 * iOS and Android fall through untouched and resolve the real package.
 */
function withMapsWebShim(resolveRequest) {
  return (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
      return { type: 'sourceFile', filePath: MAPS_WEB_SHIM };
    }

    return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = { MAPS_WEB_SHIM, withMapsWebShim };
