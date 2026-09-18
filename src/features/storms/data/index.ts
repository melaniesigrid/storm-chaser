import { asyncStorageStore } from './KeyValueStore';
import { createStormRepository } from './StormRepository';

/**
 * Composition root for the storms feature. The single place that binds the
 * repository to a concrete storage driver, so swapping it out touches one line.
 */
export const stormRepository = createStormRepository(asyncStorageStore);

export { createStormRepository } from './StormRepository';
export { createMemoryStore } from './KeyValueStore';
export type { StormRepository } from './StormRepository';
