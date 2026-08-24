import { describe, expect, it } from 'vitest'
import { shortString } from 'starknet'
import { computeBidCommitment, computeClaimHandle, type BidCommitmentInput } from '@/features/auction/commitment'

const vector: BidCommitmentInput = {
  chainId: BigInt(shortString.encodeShortString('SN_SEPOLIA')),
  auctionHouse: 0x222n,
  auctionId: 7n,
  amount: 3_000_000_000_000_000_000n,
  bidSecret: 987_654_321n,
  claimHandle: 0x3078725b5aaffe73f545ebca32c0b5a4af14404599edd691c752e59ffca3724n,
  assetRecipient: 0x333n,
}

describe('CipherBid commitments', () => {
  it('matches the frozen Poseidon V1 vectors', () => {
    expect(computeClaimHandle(123_456_789n)).toBe(0x3078725b5aaffe73f545ebca32c0b5a4af14404599edd691c752e59ffca3724n)
    expect(computeBidCommitment(vector)).toBe(0x34fe5ddb49c604d4b8b63f768c4d6e4159bdd4166bdc3e1e7094217c9f6313en)
  })

  it.each([
    ['chainId', vector.chainId + 1n],
    ['auctionHouse', vector.auctionHouse + 1n],
    ['auctionId', vector.auctionId + 1n],
    ['amount', vector.amount + 1n],
    ['bidSecret', vector.bidSecret + 1n],
    ['claimHandle', vector.claimHandle + 1n],
    ['assetRecipient', vector.assetRecipient + 1n],
  ] as const)('domain-separates a changed %s', (field, value) => {
    expect(computeBidCommitment({ ...vector, [field]: value })).not.toBe(computeBidCommitment(vector))
  })

  it('rejects zero secrets and invalid felt or amount inputs', () => {
    expect(() => computeClaimHandle(0n)).toThrow('Claim secret must be non-zero')
    expect(() => computeBidCommitment({ ...vector, bidSecret: 0n })).toThrow('Bid secret must be non-zero')
    expect(() => computeBidCommitment({ ...vector, claimHandle: 0n })).toThrow('Claim handle must be non-zero')
    expect(() => computeBidCommitment({ ...vector, amount: 0n })).toThrow('Bid amount must be between 1 and u128 max')
    expect(() => computeBidCommitment({ ...vector, amount: 1n << 128n })).toThrow(
      'Bid amount must be between 1 and u128 max',
    )
    expect(() => computeBidCommitment({ ...vector, assetRecipient: -1n })).toThrow(
      'assetRecipient must be a Starknet field element',
    )
  })
})
