/* eslint-env jest */

// The suite targets pure domain logic and the repository layer, both of which
// take their dependencies by injection. Native modules are only stubbed here so
// that importing a barrel file never drags a native binding into the test run.
jest.mock('expo-file-system', () => {
  class Directory {
    constructor(...segments) {
      this.uri = segments.map(String).join('/');
    }
    create() {}
  }

  class File {
    constructor(...segments) {
      this.uri = segments.map(String).join('/');
      this.exists = true;
    }
    async copy() {}
    delete() {}
  }

  return { Directory, File, Paths: { document: 'file:///documents' } };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));
