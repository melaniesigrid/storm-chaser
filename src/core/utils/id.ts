/**
 * Collision-resistant enough for a local field log, with no native dependency.
 * Time prefix keeps ids roughly sortable, which makes debugging storage dumps
 * considerably easier.
 */
export function createId(prefix = 'storm'): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}_${random}`;
}
