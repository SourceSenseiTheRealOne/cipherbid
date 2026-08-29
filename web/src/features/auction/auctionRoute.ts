const MAX_U64 = (1n << 64n) - 1n
const INVALID_ID_ERROR = 'Auction ID must be a positive u64 decimal value.'

export type AuctionRouteResult =
  | Readonly<{ ok: true; auctionId: bigint; canonicalId: string }>
  | Readonly<{ ok: false; displayId: string; error: string }>

function invalid(values: readonly string[], error: string = INVALID_ID_ERROR): AuctionRouteResult {
  return {
    ok: false,
    displayId: (values[0] ?? '').slice(0, 80),
    error,
  }
}

export function parseAuctionIdValues(values: readonly string[]): AuctionRouteResult {
  if (values.length !== 1) {
    return invalid(values, 'Auction URL must contain exactly one auction ID.')
  }

  let decoded: string
  try {
    decoded = decodeURIComponent(values[0])
  } catch {
    return invalid(values)
  }

  if (!/^[1-9][0-9]{0,19}$/.test(decoded)) return invalid(values)

  const auctionId = BigInt(decoded)
  if (auctionId > MAX_U64) return invalid(values)

  return { ok: true, auctionId, canonicalId: auctionId.toString() }
}

export function buildAuctionHref(value: string): string {
  return `/auction?id=${encodeURIComponent(value)}`
}
