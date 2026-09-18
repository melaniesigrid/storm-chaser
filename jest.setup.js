/* eslint-env jest */

// The suite targets pure domain logic and the repository layer, both of which
// take their dependencies by injection. Native modules are only stubbed here so
// that importing a barrel file never drags a native binding into the test run.
// Date formatting is asserted in outlook.test.ts. Without a pinned zone,
// '2026-09-19' (parsed as UTC midnight) and '2026-09-19T00:00' (local midnight)
// land on different weekdays in any negative-offset zone, and the assertions
// pass or fail by machine.
process.env.TZ = 'UTC';

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
