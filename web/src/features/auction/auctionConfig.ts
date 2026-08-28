import type { HexAddress } from '@/features/privacy/strk20Actions'
import { CONTRACT_ADDRESS_BOUND, STARK_FIELD_PRIME } from '@/features/auction/commitment'

export const MAX_U64 = (1n << 64n) - 1n
export const MAX_U128 = (1n << 128n) - 1n
export const MAX_U256 = (1n << 256n) - 1n
export const ABSOLUTE_MAX_BIDDERS = 32
export const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d' as const

export type AuctionHouseConfig = Readonly<{
  pool: HexAddress
  paymentToken: HexAddress
  maxBidders: number
}>

export type AuctionConfig = Readonly<{
  auctionId: bigint
  seller: HexAddress
  sellerClaimHandle: bigint
  nftContract: HexAddress
  tokenId: bigint
  reservePrice: bigint
  collateralCap: bigint
  biddingDeadline: bigint
  revealDeadline: bigint
  bidderLimit: number
}>

export type AuctionCreationContext = Readonly<{
  caller: HexAddress
  now: bigint
  house: AuctionHouseConfig
}>

function addressValue(value: HexAddress, error: string): bigint {
  if (!/^0x[0-9a-f]+$/i.test(value)) throw new Error(error)

  const parsed = BigInt(value)
  if (parsed <= 0n || parsed >= CONTRACT_ADDRESS_BOUND) throw new Error(error)
  return parsed
}

function requireIntegerInRange(value: number, min: number, max: number, error: string): void {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(error)
}

function requireUnsigned(value: bigint, max: bigint, error: string, allowZero: boolean): void {
  if (value < 0n || value > max || (!allowZero && value === 0n)) throw new Error(error)
}

export function defineAuctionHouseConfig(input: AuctionHouseConfig): AuctionHouseConfig {
  const pool = addressValue(input.pool, 'STRK20 pool must be non-zero')
  const paymentToken = addressValue(input.paymentToken, 'Payment token must be canonical STRK')
  if (paymentToken !== BigInt(STRK_TOKEN_ADDRESS)) throw new Error('Payment token must be canonical STRK')
  if (pool === paymentToken) throw new Error('STRK20 pool must differ from payment token')
  requireIntegerInRange(
    input.maxBidders,
    2,
    ABSOLUTE_MAX_BIDDERS,
    `House max bidders must be between 2 and ${ABSOLUTE_MAX_BIDDERS}`,
  )

  return Object.freeze({ ...input })
}

export function defineAuctionConfig(input: AuctionConfig, context: AuctionCreationContext): AuctionConfig {
  const house = defineAuctionHouseConfig(context.house)
  requireUnsigned(input.auctionId, MAX_U64, 'Auction ID must be between 1 and u64 max', false)

  const seller = addressValue(input.seller, 'Seller must be non-zero')
  const caller = addressValue(context.caller, 'Creation caller must be non-zero')
  if (seller !== caller) throw new Error('Seller must equal the creation caller')
  requireUnsigned(input.sellerClaimHandle, STARK_FIELD_PRIME - 1n, 'Seller claim handle must be a non-zero felt', false)
  addressValue(input.nftContract, 'ERC-721 contract must be non-zero')

  requireUnsigned(input.tokenId, MAX_U256, 'Token ID must fit u256', true)
  requireUnsigned(input.reservePrice, MAX_U128, 'Reserve must be between 1 and u128 max', false)
  requireUnsigned(input.collateralCap, MAX_U128, 'Collateral cap must be between 1 and u128 max', false)
  if (input.reservePrice > input.collateralCap) throw new Error('Reserve must not exceed collateral cap')

  requireUnsigned(context.now, MAX_U64, 'Current timestamp must fit u64', true)
  requireUnsigned(input.biddingDeadline, MAX_U64, 'Bidding deadline must fit u64', true)
  requireUnsigned(input.revealDeadline, MAX_U64, 'Reveal deadline must fit u64', true)
  if (input.biddingDeadline <= context.now) throw new Error('Bidding deadline must be in the future')
  if (input.biddingDeadline >= input.revealDeadline) {
    throw new Error('Bidding deadline must be before reveal deadline')
  }

  requireIntegerInRange(
    input.bidderLimit,
    2,
    house.maxBidders,
    'Auction bidder limit must be between 2 and house maximum',
  )

  return Object.freeze({ ...input })
}
