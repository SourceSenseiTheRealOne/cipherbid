import { describe, expect, it } from 'vitest'
import { evaluateDemoBidderReadiness } from '@/features/auction/demoBidderReadiness'

const bidderA = '0x054499e46751979eea7fcc64475836d1a5f591c2d12a7546e42e8516fdbabc4d' as const
const bidderB = '0x014ecc190504847edc0b29f427404b2cad833ff8837277af69f4d3bf99d82b52' as const

const ready = [
  {
    name: 'cipherbid-sepolia-bidder-a',
    address: bidderA,
    publicKey: '0x111',
    deposits: [{ amount: 15_000_000_000_000_000_000n, blockNumber: 100, transactionHash: '0xaaa' as const }],
  },
  {
    name: 'cipherbid-sepolia-bidder-b',
    address: bidderB,
    publicKey: '0x222',
    deposits: [{ amount: 20_000_000_000_000_000_000n, blockNumber: 101, transactionHash: '0xbbb' as const }],
  },
] as const

describe('Sepolia demo bidder readiness', () => {
  it('accepts distinct registered bidders with a mature 15 STRK deposit', () => {
    const result = evaluateDemoBidderReadiness({ bidders: ready, latestBlock: 111 })

    expect(result.ready).toBe(true)
    expect(result.statuses).toEqual([
      expect.objectContaining({
        name: 'cipherbid-sepolia-bidder-a',
        registered: true,
        depositAmount: 15_000_000_000_000_000_000n,
        confirmations: 11,
        ready: true,
      }),
      expect.objectContaining({
        name: 'cipherbid-sepolia-bidder-b',
        registered: true,
        depositAmount: 20_000_000_000_000_000_000n,
        confirmations: 10,
        ready: true,
      }),
    ])
  })

  it('reports every public blocker without exposing private state', () => {
    const result = evaluateDemoBidderReadiness({
      latestBlock: 105,
      bidders: [
        { ...ready[0], publicKey: '0x0' },
        {
          ...ready[1],
          deposits: [{ amount: 14_999_999_999_999_999_999n, blockNumber: 103, transactionHash: '0xbbb' as const }],
        },
      ],
    })

    expect(result.ready).toBe(false)
    expect(result.statuses[0]).toEqual(expect.objectContaining({ registered: false, ready: false }))
    expect(result.statuses[0]?.blockers).toContain('STRK20 viewing key is not registered')
    expect(result.statuses[1]?.blockers).toContain('No public STRK deposit of at least 15 STRK was found')
  })

  it('accepts any mature qualifying deposit even when a newer deposit is still immature', () => {
    const result = evaluateDemoBidderReadiness({
      latestBlock: 109,
      bidders: [
        {
          ...ready[0],
          deposits: [
            { amount: 16_000_000_000_000_000_000n, blockNumber: 90, transactionHash: '0xabc' as const },
            { amount: 15_000_000_000_000_000_000n, blockNumber: 100, transactionHash: '0xdef' as const },
          ],
        },
        ready[1],
      ],
    })

    expect(result.statuses[0]).toEqual(expect.objectContaining({ depositBlock: 90, confirmations: 19, ready: true }))
  })

  it('requires ten blocks after the oldest qualifying deposit when none is mature', () => {
    const result = evaluateDemoBidderReadiness({
      latestBlock: 109,
      bidders: [{ ...ready[0], deposits: [ready[0].deposits[0]!] }, ready[1]],
    })

    expect(result.ready).toBe(false)
    expect(result.statuses[0]).toEqual(expect.objectContaining({ depositBlock: 100, confirmations: 9, ready: false }))
    expect(result.statuses[0]?.blockers).toContain('Qualifying deposit needs 1 more block before bidding')
  })

  it('uses the fee-derived mainnet shield target as the qualifying deposit threshold', () => {
    const result = evaluateDemoBidderReadiness({
      latestBlock: 120,
      minimumPublicDeposit: 24_000_000_000_000_000_000n,
      bidders: [
        {
          ...ready[0],
          deposits: [{ amount: 23_000_000_000_000_000_000n, blockNumber: 100, transactionHash: '0xabc' as const }],
        },
        {
          ...ready[1],
          deposits: [{ amount: 24_000_000_000_000_000_000n, blockNumber: 100, transactionHash: '0xdef' as const }],
        },
      ],
    })

    expect(result.ready).toBe(false)
    expect(result.statuses[0]?.blockers).toContain('No public STRK deposit of at least 24 STRK was found')
    expect(result.statuses[1]).toEqual(
      expect.objectContaining({ ready: true, depositAmount: 24_000_000_000_000_000_000n }),
    )
  })

  it('rejects duplicate accounts or viewing public keys', () => {
    expect(() =>
      evaluateDemoBidderReadiness({ latestBlock: 111, bidders: [ready[0], { ...ready[1], address: bidderA }] }),
    ).toThrow('distinct')
    expect(() =>
      evaluateDemoBidderReadiness({
        latestBlock: 111,
        bidders: [ready[0], { ...ready[1], publicKey: ready[0].publicKey }],
      }),
    ).toThrow('distinct')
  })
})
