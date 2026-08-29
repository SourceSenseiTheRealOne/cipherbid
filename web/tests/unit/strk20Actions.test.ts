import { describe, expect, it } from 'vitest'
import { buildPlaceBidActions } from '@/features/privacy/strk20Actions'

const paymentToken = '0x111' as const
const auctionHouse = '0x222' as const

describe('buildPlaceBidActions', () => {
  it('withdraws the uniform cap to the auction house before invoking the anonymous bid', () => {
    const actions = buildPlaceBidActions({
      auctionId: 7n,
      paymentToken,
      cap: 5n,
      commitment: 101n,
      claimHandle: 202n,
      auctionHouse,
    })

    expect(actions).toEqual([
      {
        type: 'withdraw',
        token: paymentToken,
        amount: '0x5',
        recipient: auctionHouse,
      },
      {
        type: 'invoke',
        contract: auctionHouse,
        calldata: ['0x0', '0x7', '0x65', '0xca', '0x0', '0x0', '${poolAddress}', '0x0'],
      },
    ])
  })

  it('does not serialize a bidder address or normalize the pool placeholder', () => {
    const actions = buildPlaceBidActions({
      auctionId: 1n,
      paymentToken,
      cap: 9n,
      commitment: 10n,
      claimHandle: 11n,
      auctionHouse,
    })

    expect(JSON.stringify(actions)).not.toContain('bidder')
    expect(actions[1]).toMatchObject({ calldata: expect.arrayContaining(['${poolAddress}']) })
  })
})
