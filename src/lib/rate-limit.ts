/** Rate limit en memoria por clave (login/import/emisión). Monoproceso: suficiente F1;
 * con worker distribuido migrar a tabla PG (ver SECURITY.md). */
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  return true;
}

export function resetRateLimitForTests(): void {
  hits.clear();
}
