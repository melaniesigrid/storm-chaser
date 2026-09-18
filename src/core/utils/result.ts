/**
 * A tiny Result type. Data access and network code return one of these instead
 * of throwing, so callers are forced to handle the failure branch and the UI
 * always has something concrete to render ("Not found" views, retry states).
 */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type AppErrorKind =
  | 'network'
  | 'permission'
  | 'not_found'
  | 'storage'
  | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  message: string;
  cause?: unknown;
}

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = (
  kind: AppErrorKind,
  message: string,
  cause?: unknown,
): Result<never, AppError> => ({ ok: false, error: { kind, message, cause } });

/** Unwraps a Result inside a react-query fetcher, where throwing is correct. */
export function unwrap<T>(result: Result<T>): T {
  if (result.ok) return result.value;
  const error = new Error(result.error.message) as Error & { kind: string };
  error.kind = result.error.kind;
  throw error;
}
