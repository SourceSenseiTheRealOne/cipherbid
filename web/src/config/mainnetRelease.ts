import { MAINNET_CHAIN_ID, MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'

const STRK = 10n ** 18n

export const MAINNET_DEPLOYER = '0x01017404a72b0d5312d7f41e81e0a87b89387db78361bb4ce60b0e0a390d72aa' as const
export const MAINNET_BIDDER_A = '0x00289637e6debed46ce1a64ea30a9f1fa492458bac580c908f940f225fd11a8e' as const
export const MAINNET_BIDDER_B = '0x057791bafe2653e8a62509261aeba6a9d09f1fe09f039c9ff0c09c00c24b1f1a' as const

export type MainnetReleaseCandidate = Readonly<{
  network: 'mainnet'
  chainId: typeof MAINNET_CHAIN_ID
  strk20Pool: typeof MAINNET_STRK20_POOL
  paymentToken: typeof STRK_TOKEN
  deployer: typeof MAINNET_DEPLOYER
  bidderA: typeof MAINNET_BIDDER_A
  bidderB: typeof MAINNET_BIDDER_B
  reserve: bigint
  collateralCap: bigint
  bidderLimit: 2
  biddingMinutes: 10
  revealMinutes: 5
  bidderABid: bigint
  bidderBBid: bigint
  winner: 'Bidder B'
  clearingPrice: bigint
  loserRefund: bigint
  winnerSurplus: bigint
  sellerProceeds: bigint
  poolFee: bigint
  minimumBidderShield: bigint
  bidderShieldTarget: bigint
  sellerShieldTarget: bigint
  maximumMainnetBudget: bigint
}>

export function buildMainnetReleaseCandidate(poolFee: bigint): MainnetReleaseCandidate {
  if (poolFee <= 0n) throw new Error('pool fee must be positive')

  const collateralCap = 4n * STRK
  const bidderABid = 2n * STRK
  const bidderBBid = 3n * STRK
  const clearingPrice = bidderABid
  const minimumBidderShield = collateralCap + 3n * poolFee

  return Object.freeze({
    network: 'mainnet',
    chainId: MAINNET_CHAIN_ID,
    strk20Pool: MAINNET_STRK20_POOL,
    paymentToken: STRK_TOKEN,
    deployer: MAINNET_DEPLOYER,
    bidderA: MAINNET_BIDDER_A,
    bidderB: MAINNET_BIDDER_B,
    reserve: 1n * STRK,
    collateralCap,
    bidderLimit: 2,
    biddingMinutes: 10,
    revealMinutes: 5,
    bidderABid,
    bidderBBid,
    winner: 'Bidder B',
    clearingPrice,
    loserRefund: collateralCap,
    winnerSurplus: collateralCap - clearingPrice,
    sellerProceeds: clearingPrice,
    poolFee,
    minimumBidderShield,
    bidderShieldTarget: minimumBidderShield + 2n * STRK,
    sellerShieldTarget: 2n * poolFee,
    maximumMainnetBudget: 150n * STRK,
  })
}
