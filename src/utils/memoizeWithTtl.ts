export function memoizeWithTtl<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  ttlMs: number,
): (...args: Args) => Promise<T> {
  let cached: { value: T, expiresAt: number } | undefined;

  return async (...args: Args): Promise<T> => {
    if (!cached || Date.now() >= cached.expiresAt) {
      cached = { value: await fn(...args), expiresAt: Date.now() + ttlMs };
    }
    return cached.value;
  };
}
