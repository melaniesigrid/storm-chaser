// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Build output and tooling scratch space. `.claude/worktrees` matters most:
    // it holds whole checkouts of this repo, so without it every file is
    // linted twice and the second copy is whatever an old branch left behind.
    ignores: [
      '.claude/**',
      '.expo/**',
      'android/**',
      'coverage/**',
      'dist/**',
      'dist-android/**',
      'dist-check/**',
    ],
  },
  {
    // Metro and Babel config are CommonJS run by Node, not by the app's own
    // Babel pipeline, so they get Node's globals and `require`.
    files: ['*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { __dirname: 'readonly', module: 'readonly', require: 'readonly' } },
  },
  {
    // The capture scripts are ES modules run by Node directly.
    files: ['scripts/**/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { process: 'readonly', console: 'readonly' } },
  },
]);
