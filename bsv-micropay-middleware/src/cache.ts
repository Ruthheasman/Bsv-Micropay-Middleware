/**
 * In-memory transaction cache for replay protection.
 *
 * Prevents the same txId being used more than once to access the same endpoint.
 * Uses a TTL-based eviction to avoid unbounded memory growth.
 *
 * For multi-instance deployments (multiple Replit pods), swap this out for
 * a Redis-backed implementation — the interface is identical.
 */

interface CacheEntry {
  usedAt: number
  endpoint: string
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

export class TxCache {
  private store = new Map<string, CacheEntry>()
  private ttl: number

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttl = ttlMs
    // Sweep expired entries every hour
    setInterval(() => this.sweep(), 1000 * 60 * 60).unref()
  }

  /**
   * Returns true if this txId has already been used for this endpoint.
   */
  has(txId: string, endpoint: string): boolean {
    const entry = this.store.get(this.key(txId, endpoint))
    if (!entry) return false
    if (Date.now() - entry.usedAt > this.ttl) {
      this.store.delete(this.key(txId, endpoint))
      return false
    }
    return true
  }

  /**
   * Mark a txId as used for a specific endpoint.
   */
  set(txId: string, endpoint: string): void {
    this.store.set(this.key(txId, endpoint), {
      usedAt: Date.now(),
      endpoint,
    })
  }

  private key(txId: string, endpoint: string): string {
    return `${txId}::${endpoint}`
  }

  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.usedAt > this.ttl) {
        this.store.delete(key)
      }
    }
  }

  get size(): number {
    return this.store.size
  }
}

// Shared singleton — one cache per process, shared across all micropay() instances
export const txCache = new TxCache()
