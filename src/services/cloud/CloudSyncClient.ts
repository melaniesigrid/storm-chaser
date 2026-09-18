import { err, ok, type Result } from '@/core/utils/result';
import type { CommunityReport } from '@/features/storms/model/community';
import type { StormReport } from '@/features/storms/model/types';
import type { Coordinates } from '@/features/weather/model/types';

import { sampleCommunityReports } from './communitySample';

/**
 * Cloud integration code only, per the brief. No keys are committed and nothing
 * runs unless EXPO_PUBLIC_SYNC_BASE_URL is set at build time; the local log is
 * always the source of truth and sync is additive.
 *
 * Shape is deliberately provider agnostic (a signed upload URL followed by a
 * metadata POST) because that is the pattern S3, Firebase Storage and Supabase
 * Storage all support.
 */
export interface CloudSyncClient {
  isConfigured(): boolean;
  uploadReport(report: StormReport): Promise<Result<{ remoteId: string }>>;
  /**
   * Storms other chasers logged near a position.
   *
   * Configured builds hit the real endpoint. Unconfigured builds resolve a
   * bundled sample set through this same signature, so the calling code, the
   * Result boundary and the offline handling are identical either way and the
   * UI decides how to badge the result by reading `source`.
   */
  fetchCommunityReports(near: Coordinates): Promise<Result<CommunityReport[]>>;
}

const BASE_URL = process.env.EXPO_PUBLIC_SYNC_BASE_URL ?? '';

export const cloudSyncClient: CloudSyncClient = {
  isConfigured() {
    return BASE_URL.length > 0;
  },

  async fetchCommunityReports(near) {
    if (!BASE_URL) return ok(sampleCommunityReports(near));

    try {
      const response = await fetch(
        `${BASE_URL}/reports/community?lat=${near.latitude}&lon=${near.longitude}`,
      );

      if (!response.ok) {
        return err('network', `Community fetch failed with ${response.status}`);
      }

      const body = (await response.json()) as { reports?: unknown };
      if (!Array.isArray(body.reports)) {
        return err('network', 'Community response did not contain a report list');
      }

      // Anything the server sends is tagged as remote here rather than trusting
      // a source field off the wire.
      return ok(
        body.reports.map((entry) => ({
          ...(entry as CommunityReport),
          source: 'remote' as const,
        })),
      );
    } catch (cause) {
      return err('network', 'Community reports could not be reached', cause);
    }
  },

  async uploadReport(report) {
    if (!BASE_URL) {
      return err('network', 'Cloud sync is not configured for this build');
    }

    try {
      // 1. Ask the backend for a short lived upload target for the photo.
      const ticketResponse = await fetch(`${BASE_URL}/reports/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, contentType: 'image/jpeg' }),
      });

      if (!ticketResponse.ok) {
        return err('network', `Upload ticket failed with ${ticketResponse.status}`);
      }

      const ticket = (await ticketResponse.json()) as {
        uploadUrl: string;
        objectKey: string;
      };

      // 2. Stream the local file straight to storage. No credentials touch the
      //    device: the signed URL carries the authorisation.
      const photo = await fetch(report.photoUri);
      const blob = await photo.blob();

      const uploadResponse = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });

      if (!uploadResponse.ok) {
        return err('network', `Photo upload failed with ${uploadResponse.status}`);
      }

      // 3. Commit the metadata once the binary is safely stored.
      const commitResponse = await fetch(`${BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: report.id,
          objectKey: ticket.objectKey,
          capturedAt: report.capturedAt,
          coordinates: report.coordinates,
          stormType: report.stormType,
          notes: report.notes,
          conditions: report.conditions,
        }),
      });

      if (!commitResponse.ok) {
        return err('network', `Report commit failed with ${commitResponse.status}`);
      }

      const committed = (await commitResponse.json()) as { id: string };
      return ok({ remoteId: committed.id });
    } catch (cause) {
      return err('network', 'Cloud sync could not reach the server', cause);
    }
  },
};
