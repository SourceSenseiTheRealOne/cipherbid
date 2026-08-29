import { describe, expect, it } from 'vitest'
import { buildAuctionHref, parseAuctionIdValues } from '@/features/auction/auctionRoute'

describe('auction route contract', () => {
  it('accepts one positive decimal u64 auction ID', () => {
    expect(parseAuctionIdValues(['7'])).toEqual({ ok: true, auctionId: 7n, canonicalId: '7' })
    expect(parseAuctionIdValues(['18446744073709551615'])).toEqual({
      ok: true,
      auctionId: 18446744073709551615n,
      canonicalId: '18446744073709551615',
    })
  })

  it('rejects missing, duplicate, zero, oversized, or hostile IDs', () => {
    expect(parseAuctionIdValues([])).toMatchObject({ ok: false })
    expect(parseAuctionIdValues(['7', '8'])).toMatchObject({ ok: false })
    expect(parseAuctionIdValues(['0'])).toMatchObject({ ok: false })
    expect(parseAuctionIdValues(['18446744073709551616'])).toMatchObject({ ok: false })
    expect(parseAuctionIdValues(['%3Cscript%3Ealert(1)%3C/script%3E'])).toMatchObject({
      ok: false,
      displayId: '%3Cscript%3Ealert(1)%3C/script%3E',
    })
  })

  it('builds the one canonical static auction URL', () => {
    expect(buildAuctionHref('7')).toBe('/auction?id=7')
  })
})
