import { describe, expect, it } from 'vitest'
import { buildAuctionCreationPlan, parseStrkAmount } from '@/features/auction/auctionCreationPlan'

const base = {
  auctionHouse: '0x705b1080174f2b10c02fd8b2e00b918e4dc91f9021ee6a208f53d5909fcc87d' as const,
  nftContract: '0x11beadd9e02a7a633da6436bf342b407231c4fa4b77f2544e9866ba94f4d129' as const,
  tokenId: 99n,
  auctionId: 1_787_916_000_001n,
  claimHandle: 0xabcn,
  reserve: '2',
  cap: '5',
  nowSeconds: 1_787_916_000,
  biddingMinutes: 30,
  revealMinutes: 5,
  bidderLimit: 2,
}

describe('auction creation CLI plan', () => {
  it('parses canonical decimal STRK amounts to 18-decimal base units', () => {
    expect(parseStrkAmount('2')).toBe(2_000_000_000_000_000_000n)
    expect(parseStrkAmount('0.000000000000000001')).toBe(1n)
    expect(parseStrkAmount('5.25')).toBe(5_250_000_000_000_000_000n)
    expect(() => parseStrkAmount('1.0000000000000000001')).toThrow()
    expect(() => parseStrkAmount('-1')).toThrow()
  })

  it('covers every create-page field and exact atomic approve/create calldata', () => {
    const plan = buildAuctionCreationPlan(base)

    expect(plan.form).toEqual({
      auctionId: '1787916000001',
      nftContract: base.nftContract,
      tokenId: '99',
      reservePrice: '2000000000000000000',
      cap: '5000000000000000000',
      biddingDeadline: '1787917800',
      revealDeadline: '1787918100',
      bidderLimit: '2',
      sellerClaimHandle: '0xabc',
    })

    expect(plan.multicallTokens).toEqual([
      'invoke',
      '--contract-address',
      base.nftContract,
      '--function',
      'approve',
      '--calldata',
      base.auctionHouse,
      '99',
      '0',
      '/',
      'invoke',
      '--contract-address',
      base.auctionHouse,
      '--function',
      'create_auction',
      '--calldata',
      '1787916000001',
      '0xabc',
      base.nftContract,
      '99',
      '0',
      '2000000000000000000',
      '5000000000000000000',
      plan.form.biddingDeadline,
      plan.form.revealDeadline,
      '2',
    ])
  })

  it('rejects invalid auction economics or windows before invoking Sncast', () => {
    expect(() => buildAuctionCreationPlan({ ...base, reserve: '6' })).toThrow('reserve')
    expect(() => buildAuctionCreationPlan({ ...base, biddingMinutes: 0 })).toThrow('Bidding')
    expect(() => buildAuctionCreationPlan({ ...base, revealMinutes: 6 })).toThrow('at most 5 minutes')
    expect(() => buildAuctionCreationPlan({ ...base, bidderLimit: 33 })).toThrow('Bidder')
  })
})
