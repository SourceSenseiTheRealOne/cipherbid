import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeBidCommitment, computeClaimHandle, type BidCommitmentInput } from '@/features/auction/commitment'

type StringRecord = Readonly<Record<string, string>>
type Vector = Readonly<{
  name: string
  claimSecret: string
  claimHandle: string
  chainId: string
  auctionHouse: string
  auctionId: string
  amount: string
  bidNonce: string
  assetRecipient: string
  commitment: string
}>

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/bid-credentials-v1.json'), 'utf8'),
) as Readonly<{
  schema: string
  domains: Readonly<Record<'claim' | 'bid', Readonly<{ literal: string; felt: string }>>>
  boundaries: StringRecord
  preimages: Readonly<Record<'claimHandle' | 'bidCommitment', readonly string[]>>
  vectors: readonly Vector[]
  invalid: Readonly<Record<keyof BidCommitmentInput | 'claimSecret', readonly string[]>>
  credentialModel: Readonly<{
    private: readonly string[]
    derivedPublic: readonly string[]
    publicAtReveal: readonly string[]
    supersededFieldsForbidden: readonly string[]
  }>
}>

function input(vector: Vector): BidCommitmentInput {
  return {
    chainId: BigInt(vector.chainId),
    auctionHouse: BigInt(vector.auctionHouse),
    auctionId: BigInt(vector.auctionId),
    amount: BigInt(vector.amount),
    bidNonce: BigInt(vector.bidNonce),
    claimHandle: BigInt(vector.claimHandle),
    assetRecipient: BigInt(vector.assetRecipient),
  }
}

const reference = input(fixture.vectors[0])

describe('CipherBid bid credentials v1', () => {
  it('freezes domains, preimage order, boundaries, and the credential model', () => {
    expect(fixture.schema).toBe('cipherbid.bid-credentials.v1')
    expect(fixture.domains).toEqual({
      claim: { literal: 'CIPHERBID_CLAIM_V1', felt: '0x4349504845524249445f434c41494d5f5631' },
      bid: { literal: 'CIPHERBID_BID_V1', felt: '0x4349504845524249445f4249445f5631' },
    })
    expect(fixture.preimages.claimHandle).toEqual(['claim_domain', 'claim_secret'])
    expect(fixture.preimages.bidCommitment).toEqual([
      'bid_domain',
      'chain_id',
      'auction_house',
      'auction_id',
      'amount',
      'bid_nonce',
      'claim_handle',
      'asset_recipient',
    ])
    expect(fixture.boundaries).toEqual({
      feltPrime: '0x800000000000011000000000000000000000000000000000000000000000001',
      contractAddressBound: '0x800000000000000000000000000000000000000000000000000000000000000',
      u64Max: '18446744073709551615',
      u128Max: '340282366920938463463374607431768211455',
    })
    expect(fixture.credentialModel).toEqual({
      private: ['bid_nonce', 'claim_secret'],
      derivedPublic: ['claim_handle', 'bid_commitment'],
      publicAtReveal: ['amount', 'bid_nonce', 'claim_handle', 'asset_recipient'],
      supersededFieldsForbidden: ['claim_signing_key', 'claim_public_key', 'claim_signature'],
    })
  })

  it.each(fixture.vectors)('matches the $name TypeScript/Cairo Poseidon vector', (vector) => {
    expect(computeClaimHandle(BigInt(vector.claimSecret))).toBe(BigInt(vector.claimHandle))
    expect(computeBidCommitment(input(vector))).toBe(BigInt(vector.commitment))
  })

  it.each(['chainId', 'auctionHouse', 'auctionId', 'amount', 'bidNonce', 'claimHandle', 'assetRecipient'] as const)(
    'binds %s into the bid commitment',
    (field) => {
      expect(computeBidCommitment({ ...reference, [field]: reference[field] + 1n })).not.toBe(
        computeBidCommitment(reference),
      )
    },
  )

  it.each(fixture.invalid.claimSecret)('rejects invalid claim secret %s', (value) => {
    expect(() => computeClaimHandle(BigInt(value))).toThrow()
  })

  it.each(Object.entries(fixture.invalid).filter(([field]) => field !== 'claimSecret'))(
    'rejects invalid %s boundaries',
    (field, values) => {
      for (const value of values) {
        expect(() => computeBidCommitment({ ...reference, [field]: BigInt(value) })).toThrow()
      }
    },
  )
})
