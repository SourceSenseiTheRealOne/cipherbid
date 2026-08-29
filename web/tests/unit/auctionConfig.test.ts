import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ABSOLUTE_MAX_BIDDERS,
  MAX_U128,
  MAX_U256,
  MAX_U64,
  STRK_TOKEN_ADDRESS,
  defineAuctionConfig,
  defineAuctionHouseConfig,
} from '@/features/auction/auctionConfig'
import { STARK_FIELD_PRIME } from '@/features/auction/commitment'

const pool = '0x123' as const
const seller = '0xabc' as const
const nftContract = '0xdef' as const
const sellerClaimHandle = 0x54b096c60c80fd98e2e6f2495db67227a0c8c2bdc69733df8fa23a4a5eb0e28n
const maxContractAddress = '0x7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' as const
const firstInvalidContractAddress = '0x800000000000000000000000000000000000000000000000000000000000000' as const

function house(overrides: Partial<Parameters<typeof defineAuctionHouseConfig>[0]> = {}) {
  return defineAuctionHouseConfig({
    pool,
    paymentToken: STRK_TOKEN_ADDRESS,
    maxBidders: ABSOLUTE_MAX_BIDDERS,
    ...overrides,
  })
}

function auction(overrides: Partial<Parameters<typeof defineAuctionConfig>[0]> = {}) {
  return defineAuctionConfig(
    {
      auctionId: 7n,
      seller,
      sellerClaimHandle,
      nftContract,
      tokenId: 0n,
      reservePrice: 1_000n,
      collateralCap: 5_000n,
      biddingDeadline: 2_000n,
      revealDeadline: 3_000n,
      bidderLimit: 2,
      ...overrides,
    },
    {
      caller: seller,
      now: 1_000n,
      house: house(),
    },
  )
}

describe('auction configuration v2', () => {
  it('defines immutable reusable house and per-auction configurations', () => {
    const houseConfig = house()
    const auctionConfig = auction()

    expect(houseConfig).toEqual({
      pool,
      paymentToken: STRK_TOKEN_ADDRESS,
      maxBidders: 32,
    })
    expect(auctionConfig).toEqual({
      auctionId: 7n,
      seller,
      sellerClaimHandle,
      nftContract,
      tokenId: 0n,
      reservePrice: 1_000n,
      collateralCap: 5_000n,
      biddingDeadline: 2_000n,
      revealDeadline: 3_000n,
      bidderLimit: 2,
    })
    expect(Object.isFrozen(houseConfig)).toBe(true)
    expect(Object.isFrozen(auctionConfig)).toBe(true)
  })

  it('requires a non-zero pool, canonical STRK token, and bounded deployment maximum', () => {
    expect(() => house({ pool: '0x0' })).toThrow('STRK20 pool must be non-zero')
    expect(() => house({ pool: STRK_TOKEN_ADDRESS })).toThrow('STRK20 pool must differ from payment token')
    expect(() => house({ paymentToken: '0x999' })).toThrow('Payment token must be canonical STRK')
    expect(() => house({ maxBidders: 1 })).toThrow('House max bidders must be between 2 and 32')
    expect(() => house({ maxBidders: 33 })).toThrow('House max bidders must be between 2 and 32')
    expect(() => house({ maxBidders: 2.5 })).toThrow('House max bidders must be between 2 and 32')
  })

  it('binds the non-zero seller to the creation caller and requires a non-zero NFT contract', () => {
    expect(() => auction({ seller: '0x0' })).toThrow('Seller must be non-zero')
    expect(() =>
      defineAuctionConfig(
        {
          ...auction(),
          seller,
        },
        { caller: '0xbeef', now: 1_000n, house: house() },
      ),
    ).toThrow('Seller must equal the creation caller')
    expect(() => auction({ nftContract: '0x0' })).toThrow('ERC-721 contract must be non-zero')
  })

  it('requires a non-zero felt seller claim handle', () => {
    expect(() => auction({ sellerClaimHandle: 0n })).toThrow('Seller claim handle must be a non-zero felt')
    expect(() => auction({ sellerClaimHandle: STARK_FIELD_PRIME })).toThrow(
      'Seller claim handle must be a non-zero felt',
    )
    expect(auction({ sellerClaimHandle: STARK_FIELD_PRIME - 1n }).sellerClaimHandle).toBe(STARK_FIELD_PRIME - 1n)
  })

  it('accepts 2^251 - 1 and rejects 2^251 for every ContractAddress field', () => {
    expect(house({ pool: maxContractAddress }).pool).toBe(maxContractAddress)
    expect(() => house({ pool: firstInvalidContractAddress })).toThrow('STRK20 pool must be non-zero')
    expect(() => house({ paymentToken: firstInvalidContractAddress })).toThrow('Payment token must be canonical STRK')

    expect(
      defineAuctionConfig(
        { ...auction(), seller: maxContractAddress, nftContract: maxContractAddress },
        { caller: maxContractAddress, now: 1_000n, house: house() },
      ),
    ).toMatchObject({ seller: maxContractAddress, nftContract: maxContractAddress })
    expect(() => auction({ seller: firstInvalidContractAddress })).toThrow('Seller must be non-zero')
    expect(() =>
      defineAuctionConfig(
        { ...auction(), seller },
        { caller: firstInvalidContractAddress, now: 1_000n, house: house() },
      ),
    ).toThrow('Creation caller must be non-zero')
    expect(() => auction({ nftContract: firstInvalidContractAddress })).toThrow('ERC-721 contract must be non-zero')
  })

  it('requires a non-zero unique-domain u64 auction id and a u256 token id', () => {
    expect(() => auction({ auctionId: 0n })).toThrow('Auction ID must be between 1 and u64 max')
    expect(() => auction({ auctionId: MAX_U64 + 1n })).toThrow('Auction ID must be between 1 and u64 max')
    expect(() => auction({ tokenId: -1n })).toThrow('Token ID must fit u256')
    expect(() => auction({ tokenId: MAX_U256 + 1n })).toThrow('Token ID must fit u256')
    expect(auction({ tokenId: MAX_U256 }).tokenId).toBe(MAX_U256)
  })

  it('requires 0 < reserve <= cap within u128', () => {
    expect(() => auction({ reservePrice: 0n })).toThrow('Reserve must be between 1 and u128 max')
    expect(() => auction({ reservePrice: MAX_U128 + 1n })).toThrow('Reserve must be between 1 and u128 max')
    expect(() => auction({ collateralCap: 0n })).toThrow('Collateral cap must be between 1 and u128 max')
    expect(() => auction({ collateralCap: MAX_U128 + 1n })).toThrow('Collateral cap must be between 1 and u128 max')
    expect(() => auction({ reservePrice: 5_001n, collateralCap: 5_000n })).toThrow(
      'Reserve must not exceed collateral cap',
    )
    expect(auction({ reservePrice: 5_000n, collateralCap: 5_000n }).reservePrice).toBe(5_000n)
  })

  it('requires now < bidding deadline < reveal deadline within u64', () => {
    expect(() => auction({ biddingDeadline: 1_000n })).toThrow('Bidding deadline must be in the future')
    expect(() => auction({ biddingDeadline: 3_000n, revealDeadline: 3_000n })).toThrow(
      'Bidding deadline must be before reveal deadline',
    )
    expect(() => auction({ biddingDeadline: MAX_U64 + 1n })).toThrow('Bidding deadline must fit u64')
    expect(() => auction({ revealDeadline: MAX_U64 + 1n })).toThrow('Reveal deadline must fit u64')
  })

  it('bounds each auction bidder limit by the reusable house configuration', () => {
    expect(() => auction({ bidderLimit: 1 })).toThrow('Auction bidder limit must be between 2 and house maximum')
    expect(() => auction({ bidderLimit: 33 })).toThrow('Auction bidder limit must be between 2 and house maximum')
    expect(() => auction({ bidderLimit: 2.5 })).toThrow('Auction bidder limit must be between 2 and house maximum')

    expect(() =>
      defineAuctionConfig(
        { ...auction(), bidderLimit: 5 },
        { caller: seller, now: 1_000n, house: house({ maxBidders: 4 }) },
      ),
    ).toThrow('Auction bidder limit must be between 2 and house maximum')
  })

  it('revalidates the deployment configuration before using its bidder bound', () => {
    expect(() =>
      defineAuctionConfig(
        { ...auction(), bidderLimit: 50 },
        {
          caller: seller,
          now: 1_000n,
          house: { pool, paymentToken: STRK_TOKEN_ADDRESS, maxBidders: 100 },
        },
      ),
    ).toThrow('House max bidders must be between 2 and 32')
  })

  it('matches the canonical fixture and freezes permanent immutability semantics', () => {
    const fixture = JSON.parse(
      readFileSync(resolve(process.cwd(), 'tests/fixtures/auction-configuration-v2.json'), 'utf8'),
    ) as {
      schema: string
      house: Record<string, unknown>
      auction: Record<string, unknown>
      creation: { caller: `0x${string}`; now: string }
      boundaries: Record<string, unknown>
      semantics: Record<string, unknown>
    }

    expect(fixture.schema).toBe('cipherbid.auction-configuration.v2')
    expect(house()).toEqual(fixture.house)
    expect(auction()).toEqual({
      ...fixture.auction,
      auctionId: BigInt(fixture.auction.auctionId as string),
      sellerClaimHandle: BigInt(fixture.auction.sellerClaimHandle as string),
      tokenId: BigInt(fixture.auction.tokenId as string),
      reservePrice: BigInt(fixture.auction.reservePrice as string),
      collateralCap: BigInt(fixture.auction.collateralCap as string),
      biddingDeadline: BigInt(fixture.auction.biddingDeadline as string),
      revealDeadline: BigInt(fixture.auction.revealDeadline as string),
    })
    expect(fixture.creation).toEqual({ caller: seller, now: '1000' })
    expect(fixture.boundaries).toEqual({ contractAddressBound: firstInvalidContractAddress })
    expect(fixture.semantics).toEqual({
      auctionIdScope: ['chain_id', 'auction_house_address', 'auction_id'],
      auctionIdReuse: 'forbidden_forever',
      sellerSource: 'creation_caller',
      sellerClaimHandleMutable: false,
      sellerClaimSecretStored: false,
      poolDiffersFromPaymentToken: true,
      tokenIdZeroAllowed: true,
      biddingOpen: 'now < bidding_deadline',
      revealOpen: 'bidding_deadline <= now < reveal_deadline',
      settlementOpen: 'now >= reveal_deadline',
      houseConfigurationMutable: false,
      auctionConfigurationMutable: false,
      lifecycleStateMutable: true,
    })
  })
})
