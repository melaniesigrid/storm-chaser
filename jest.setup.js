/* eslint-env jest */

// The suite targets pure domain logic and the repository layer, both of which
// take their dependencies by injection. Native modules are only stubbed here so
// that importing a barrel file never drags a native binding into the test run.
//
// The zone is pinned so date assertions do not pass or fail by machine. UTC is
// the default, but it is deliberately overridable: a bug class this project has
// already shipped once (a date-only string parsed as UTC midnight, shifting
// every outlook row back a day west of UTC) is INVISIBLE under UTC. Running the
// suite under a negative offset is what catches it:
//
//     npm run test:tz     (SC_TEST_TZ=America/Toronto)
//
// Set SC_TEST_TZ rather than TZ, so an unrelated TZ already in the environment
// cannot silently unpin the default.
process.env.TZ = process.env.SC_TEST_TZ || 'UTC';

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
