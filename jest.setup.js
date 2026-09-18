/* eslint-env jest */

// The suite targets pure domain logic and the repository layer, both of which
// take their dependencies by injection. Native modules are only stubbed here so
// that importing a barrel file never drags a native binding into the test run.
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  copyAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));
