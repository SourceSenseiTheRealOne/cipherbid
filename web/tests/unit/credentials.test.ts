import { describe, expect, it } from 'vitest'
import {
  bindAcceptedIndex,
  createBidderCredential,
  createSellerCredential,
  generateNonZeroFelt,
} from '@/features/credentials/credentials'
import { computeBidCommitment, computeClaimHandle } from '@/features/auction/commitment'

const binding = {
  network: 'sepolia' as const,
  chainId: 0x534e5f5345504f4c4941n,
  auctionHouse: 0x123n,
  auctionId: 7n,
}

describe('CipherBid credentials', () => {
  it('creates domain-bound seller and bidder credentials without signing keys', () => {
    const seller = createSellerCredential({ ...binding, claimSecret: 0x501n })
    expect(seller).toEqual({
      schema: 'cipherbid.credential.v1',
      role: 'seller',
      ...binding,
      claimSecret: 0x501n,
      claimHandle: computeClaimHandle(0x501n),
    })

    const bidder = createBidderCredential({
      ...binding,
      claimSecret: 0x502n,
      bidNonce: 0x601n,
      amount: 4n,
      assetRecipient: 0x888n,
    })
    expect(bidder.claimHandle).toBe(computeClaimHandle(0x502n))
    expect(bidder.commitment).toBe(
      computeBidCommitment({
        chainId: binding.chainId,
        auctionHouse: binding.auctionHouse,
        auctionId: binding.auctionId,
        amount: 4n,
        bidNonce: 0x601n,
        claimHandle: bidder.claimHandle,
        assetRecipient: 0x888n,
      }),
    )
    expect(Object.keys(bidder)).not.toContain('claimPrivateKey')
    expect(Object.keys(bidder)).not.toContain('claimPublicKey')
    expect(Object.keys(bidder)).not.toContain('signature')
    expect(bindAcceptedIndex(bidder, 1)).toMatchObject({ acceptedIndex: 1 })
  })

  it('uses rejection sampling for a non-zero Stark field element', () => {
    let calls = 0
    const value = generateNonZeroFelt((bytes) => {
      bytes.fill(0)
      if (calls++ === 1) bytes[0] = 7
    })
    expect(calls).toBe(2)
    expect(value).toBe(7n)
  })

  it('rejects malformed bindings and credentials', () => {
    expect(() => createSellerCredential({ ...binding, auctionId: 0n, claimSecret: 1n })).toThrow('auctionId')
    expect(() => createSellerCredential({ ...binding, claimSecret: 0n })).toThrow('Claim secret')
    expect(() =>
      createBidderCredential({
        ...binding,
        claimSecret: 1n,
        bidNonce: 0n,
        amount: 4n,
        assetRecipient: 0x888n,
      }),
    ).toThrow('Bid nonce')
    expect(() =>
      createBidderCredential({
        ...binding,
        claimSecret: 1n,
        bidNonce: 2n,
        amount: 0n,
        assetRecipient: 0x888n,
      }),
    ).toThrow('Bid amount')
  })
})
