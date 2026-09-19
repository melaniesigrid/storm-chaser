module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.claude/'],
  // `.claude/worktrees` holds whole checkouts of this repo. Ignoring their
  // TESTS was not enough: haste still crawled their `__mocks__`, found a
  // second `svgMock.js` and warned about a duplicate manual mock on every run.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Metro resolves these through react-native-svg-transformer; Jest cannot,
    // so Meteocons imports resolve to a stub component instead.
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|@tanstack/.*))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.tsx', '!src/**/index.ts'],
};
