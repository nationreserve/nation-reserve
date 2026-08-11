/* eslint-disable @typescript-eslint/require-await */
export interface RateLimitStore {
  increment(key: string, windowSeconds: number): Promise<number>;
}
export class MemoryRateLimitStore implements RateLimitStore {
  readonly #entries = new Map<string, { count: number; expires: number }>();
  constructor(nodeEnv: string) {
    if (nodeEnv === "production") throw new Error("In-memory rate limiting is forbidden in production.");
  }
  async increment(key: string, windowSeconds: number) {
    const now = Date.now(); const prior = this.#entries.get(key);
    const next = !prior || prior.expires <= now
      ? { count: 1, expires: now + windowSeconds * 1000 }
      : { count: prior.count + 1, expires: prior.expires };
    this.#entries.set(key, next); return next.count;
  }
}

