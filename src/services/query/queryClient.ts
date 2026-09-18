import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      // Offline support: cached entries survive a cold start for a full day, so
      // the app opens with the last known conditions instead of a spinner.
      gcTime: 24 * 60 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'storm-chaser/query-cache',
  throttleTime: 2000,
});

export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
