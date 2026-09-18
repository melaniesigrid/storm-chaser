import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createId } from '@/core/utils/id';
import { unwrap } from '@/core/utils/result';

import { stormRepository } from '../data';
import { deletePhoto, persistPhoto } from '../data/photoStore';
import type { StormReport, StormReportDraft } from '../model/types';

export const stormKeys = {
  all: ['storms'] as const,
  list: () => ['storms', 'list'] as const,
  detail: (id: string) => ['storms', 'detail', id] as const,
};

export function useStormReports() {
  return useQuery<StormReport[]>({
    queryKey: stormKeys.list(),
    queryFn: async () => unwrap(await stormRepository.list()),
    staleTime: 0,
  });
}

export function useStormReport(id: string | undefined) {
  return useQuery<StormReport>({
    queryKey: stormKeys.detail(id ?? 'unknown'),
    enabled: Boolean(id),
    queryFn: async () => unwrap(await stormRepository.getById(id as string)),
  });
}

export interface CreateStormInput extends Omit<StormReportDraft, 'photoUri'> {
  /** Temporary camera URI. Copied into app storage before the record is written. */
  temporaryPhotoUri: string;
}

/**
 * Photo first, record second. If the copy fails the mutation stops before a
 * report is written, so the log can never contain an entry pointing at an image
 * that is not there.
 */
export function useCreateStormReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ temporaryPhotoUri, ...draft }: CreateStormInput) => {
      const reportId = createId();
      const photoUri = unwrap(await persistPhoto(temporaryPhotoUri, reportId));
      return unwrap(await stormRepository.create({ ...draft, photoUri }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stormKeys.all });
    },
  });
}

export function useDeleteStormReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: StormReport) => {
      unwrap(await stormRepository.remove(report.id));
      // Best effort: an orphaned file is recoverable, a missing record is not.
      await deletePhoto(report.photoUri);
      return report.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stormKeys.all });
    },
  });
}
