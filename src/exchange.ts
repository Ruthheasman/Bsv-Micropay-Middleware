const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash-sv&vs_currencies=usd'

interface CachedRate {
  bsvPerUsd: number
  fetchedAt: number
}

interface CoinGeckoResponse {
  'bitcoin-cash-sv'?: {
    usd?: number
  }
}

let cached: CachedRate | null = null

export async function getBsvUsdRate(cacheTtlMs: number = 300_000): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
    return cached.bsvPerUsd
  }

  const response = await fetch(COINGECKO_URL)
  if (!response.ok) {
    if (cached) {
      const staleAge = Date.now() - cached.fetchedAt
      if (staleAge < cacheTtlMs * 6) {
        console.error(`[micropay] Exchange rate fetch failed (${response.status}), using stale rate (${Math.round(staleAge / 1000)}s old)`)
        return cached.bsvPerUsd
      }
    }
    throw new Error(`[micropay] Failed to fetch BSV/USD exchange rate: ${response.status}`)
  }

  const data: CoinGeckoResponse = await response.json()
  const usdPrice = data['bitcoin-cash-sv']?.usd

  if (!usdPrice || usdPrice <= 0) {
    if (cached) {
      console.error('[micropay] Invalid exchange rate data, using stale rate')
      return cached.bsvPerUsd
    }
    throw new Error('[micropay] Invalid BSV/USD exchange rate from CoinGecko')
  }

  const bsvPerUsd = 1 / usdPrice

  cached = { bsvPerUsd, fetchedAt: Date.now() }
  return bsvPerUsd
}

export async function convertUsdToBsv(
  usdAmount: number,
  bufferPercent: number = 2,
  cacheTtlMs: number = 300_000,
): Promise<number> {
  const rate = await getBsvUsdRate(cacheTtlMs)
  const bsvAmount = usdAmount * rate
  const buffered = bsvAmount * (1 + bufferPercent / 100)
  return Math.ceil(buffered * 1e8) / 1e8
}

export async function convertUsdToBsvRange(
  usdAmount: number,
  bufferPercent: number = 2,
  cacheTtlMs: number = 300_000,
): Promise<{ quoted: number; minimum: number }> {
  const rate = await getBsvUsdRate(cacheTtlMs)
  const bsvAmount = usdAmount * rate
  const quoted = Math.ceil(bsvAmount * (1 + bufferPercent / 100) * 1e8) / 1e8
  const minimum = Math.floor(bsvAmount * (1 - bufferPercent / 100) * 1e8) / 1e8
  return { quoted, minimum }
}
