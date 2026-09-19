import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* eslint-disable @typescript-eslint/no-require-imports */
const { MAPS_WEB_SHIM, withMapsWebShim } = require('../metro.maps-web.js');

/**
 * `react-native-maps` is native only: its layer specs call
 * `codegenNativeComponent`, which `react-native-web` does not export, so
 * importing the package in a web bundle throws while the module is still
 * evaluating and takes the whole Map tab down with it.
 *
 * The alias that avoids that is one line of build config nothing else
 * references, which is exactly what a later edit drops silently -- the app
 * keeps building and the Map tab white-screens in the browser again. These
 * tests hold it in place.
 */
/** Stands in for Metro's resolution context. */
function fallbackContext() {
  return {
    resolveRequest: jest.fn(() => ({ type: 'sourceFile', filePath: 'default-resolution' })),
  };
}

describe('web resolution for react-native-maps', () => {
  it('points the web bundle at the local stand-in', () => {
    const context = fallbackContext();
    const resolveRequest = withMapsWebShim(undefined);

    expect(resolveRequest(context, 'react-native-maps', 'web')).toEqual({
      type: 'sourceFile',
      filePath: MAPS_WEB_SHIM,
    });
    expect(context.resolveRequest).not.toHaveBeenCalled();
  });

  it('leaves ios and android on the real package', () => {
    for (const platform of ['ios', 'android'] as const) {
      const context = fallbackContext();

      withMapsWebShim(undefined)(context, 'react-native-maps', platform);

      expect(context.resolveRequest).toHaveBeenCalledWith(context, 'react-native-maps', platform);
    }
  });

  it('leaves every other web import alone', () => {
    const context = fallbackContext();

    withMapsWebShim(undefined)(context, 'react-native-svg', 'web');

    expect(context.resolveRequest).toHaveBeenCalledWith(context, 'react-native-svg', 'web');
  });

  it('chains to an existing resolver rather than replacing it', () => {
    const context = fallbackContext();
    const existing = jest.fn(() => ({ type: 'sourceFile', filePath: 'from-existing' }));

    expect(withMapsWebShim(existing)(context, 'expo-router', 'web')).toEqual({
      type: 'sourceFile',
      filePath: 'from-existing',
    });
    expect(context.resolveRequest).not.toHaveBeenCalled();
  });

  it('has a stand-in on disk to resolve to', () => {
    expect(existsSync(MAPS_WEB_SHIM)).toBe(true);
  });

  it('is wired into the Metro config', () => {
    const metroConfig = readFileSync(resolve(__dirname, '../metro.config.js'), 'utf8');

    expect(metroConfig).toContain('withMapsWebShim');
    expect(metroConfig).toContain('config.resolver.resolveRequest = withMapsWebShim(');
  });
});
