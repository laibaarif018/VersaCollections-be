/**
 * Escapes regex metacharacters so free-text search input can be dropped into
 * a `RegExp` as a literal match rather than a pattern — otherwise a search
 * term like `a+b` or `(test)` either throws or matches the wrong thing.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
