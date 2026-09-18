module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // Reanimated 4 runs its animations through worklets, and worklets only
    // exist if this plugin rewrites them at build time. It has to stay last:
    // the plugin assumes every other transform has already run.
    plugins: ['react-native-worklets/plugin'],
  };
};
