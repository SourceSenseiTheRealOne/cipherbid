import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deriveAuctionPhase, settleVickrey, type AcceptedBid } from '@/features/auction/auctionLifecycle'

type FixtureScenario = Readonly<{
  name: string
  reserve: string
  cap: string
  bids: readonly Readonly<{
    acceptedIndex: number
    commitment: string
    amount: string | null
  }>[]
  expected: Readonly<{
    sold: boolean
    winnerIndex: number | null
    clearingPrice: string
    bidderClaims: readonly Readonly<{ acceptedIndex: number; kind: string; amount: string }>[]
    sellerEntitlement: string
    lockedCollateral: string
    distributedValue: string
  }>
}>

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/auction-lifecycle-v1.json'), 'utf8'),
) as Readonly<{
  schema: string
  states: readonly string[]
  phaseBoundaries: Readonly<Record<string, string>>
  rules: Readonly<Record<string, string>>
  scenarios: readonly FixtureScenario[]
}>

describe('auction lifecycle v1', () => {
  it('freezes exact phase boundaries and terminal states', () => {
    expect(fixture.schema).toBe('cipherbid.auction-lifecycle.v1')
    expect(fixture.states).toEqual([
      'BiddingOpen',
      'RevealOpen',
      'ReadyToSettle',
      'SettledSold',
      'SettledNoSale',
      'ClaimsComplete',
    ])
    expect(deriveAuctionPhase({ now: 9n, biddingDeadline: 10n, revealDeadline: 20n })).toBe('BiddingOpen')
    expect(deriveAuctionPhase({ now: 10n, biddingDeadline: 10n, revealDeadline: 20n })).toBe('RevealOpen')
    expect(deriveAuctionPhase({ now: 20n, biddingDeadline: 10n, revealDeadline: 20n })).toBe('ReadyToSettle')
    expect(deriveAuctionPhase({ now: 20n, biddingDeadline: 10n, revealDeadline: 20n, settlement: 'sold' })).toBe(
      'SettledSold',
    )
    expect(deriveAuctionPhase({ now: 20n, biddingDeadline: 10n, revealDeadline: 20n, settlement: 'no_sale' })).toBe(
      'SettledNoSale',
    )
    expect(
      deriveAuctionPhase({
        now: 20n,
        biddingDeadline: 10n,
        revealDeadline: 20n,
        settlement: 'sold',
        claimsComplete: true,
      }),
    ).toBe('ClaimsComplete')
  })

  it.each(fixture.scenarios)('settles $name with exact conservation', (scenario) => {
    const bids: AcceptedBid[] = scenario.bids.map((bid) => ({
      acceptedIndex: bid.acceptedIndex,
      commitment: BigInt(bid.commitment),
      amount: bid.amount === null ? null : BigInt(bid.amount),
    }))
    const result = settleVickrey({ reserve: BigInt(scenario.reserve), cap: BigInt(scenario.cap), bids })

    expect({
      sold: result.sold,
      winnerIndex: result.winnerIndex,
      clearingPrice: result.clearingPrice.toString(),
      bidderClaims: result.bidderClaims.map((claim) => ({ ...claim, amount: claim.amount.toString() })),
      sellerEntitlement: result.sellerEntitlement.toString(),
      lockedCollateral: result.lockedCollateral.toString(),
      distributedValue: result.distributedValue.toString(),
    }).toEqual(scenario.expected)
    expect(result.distributedValue).toBe(result.lockedCollateral)
  })

  it('rejects invalid reserve, cap, duplicate indices, and over-cap reveals', () => {
    expect(() => settleVickrey({ reserve: 0n, cap: 5n, bids: [] })).toThrow()
    expect(() => settleVickrey({ reserve: 6n, cap: 5n, bids: [] })).toThrow()
    expect(() =>
      settleVickrey({
        reserve: 1n,
        cap: 5n,
        bids: [
          { acceptedIndex: 0, commitment: 1n, amount: 2n },
          { acceptedIndex: 0, commitment: 2n, amount: 3n },
        ],
      }),
    ).toThrow()
    expect(() =>
      settleVickrey({
        reserve: 1n,
        cap: 5n,
        bids: [{ acceptedIndex: 0, commitment: 1n, amount: 6n }],
      }),
    ).toThrow()
  })
})
