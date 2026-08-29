import { describe, expect, it } from 'vitest'
import {
  MAINNET_BIDDER_A,
  MAINNET_BIDDER_B,
  MAINNET_DEPLOYER,
  buildMainnetReleaseCandidate,
} from '@/config/mainnetRelease'

const STRK = 10n ** 18n

describe('mainnet release candidate', () => {
  it('freezes the approved accounts and small-value Vickrey lifecycle', () => {
    const candidate = buildMainnetReleaseCandidate(6n * STRK)

    expect(MAINNET_DEPLOYER).toBe('0x01017404a72b0d5312d7f41e81e0a87b89387db78361bb4ce60b0e0a390d72aa')
    expect(MAINNET_BIDDER_A).toBe('0x00289637e6debed46ce1a64ea30a9f1fa492458bac580c908f940f225fd11a8e')
    expect(MAINNET_BIDDER_B).toBe('0x057791bafe2653e8a62509261aeba6a9d09f1fe09f039c9ff0c09c00c24b1f1a')
    expect(candidate).toMatchObject({
      network: 'mainnet',
      reserve: 1n * STRK,
      collateralCap: 4n * STRK,
      bidderLimit: 2,
      biddingMinutes: 10,
      revealMinutes: 5,
      bidderABid: 2n * STRK,
      bidderBBid: 3n * STRK,
      winner: 'Bidder B',
      clearingPrice: 2n * STRK,
      loserRefund: 4n * STRK,
      winnerSurplus: 2n * STRK,
      sellerProceeds: 2n * STRK,
      minimumBidderShield: 22n * STRK,
      bidderShieldTarget: 24n * STRK,
      sellerShieldTarget: 12n * STRK,
      maximumMainnetBudget: 150n * STRK,
    })
  })

  it('derives fee-sensitive shield targets and rejects an invalid pool fee', () => {
    expect(buildMainnetReleaseCandidate(7n * STRK)).toMatchObject({
      minimumBidderShield: 25n * STRK,
      bidderShieldTarget: 27n * STRK,
      sellerShieldTarget: 14n * STRK,
    })
    expect(() => buildMainnetReleaseCandidate(0n)).toThrow('pool fee must be positive')
  })
})
