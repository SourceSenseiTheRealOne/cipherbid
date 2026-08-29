import { buildAuctionCreationPlan } from '@/features/auction/auctionCreationPlan'
import {
  AUCTION_HOUSE_CLASS_HASH,
  DEMO_ERC721_CLASS_HASH,
  MAINNET_MAXIMUM_BUDGET,
} from '@/config/mainnetDeploymentPlan'
import { MAINNET_CHAIN_ID, MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'
import { MAINNET_DEPLOYER } from '@/config/mainnetRelease'

function sameFelt(left: unknown, right: string): boolean {
  if (typeof left !== 'string') return false
  try {
    return BigInt(left) === BigInt(right)
  } catch {
    return false
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Mainnet deployment record must be an object')
  }
  return value as Record<string, unknown>
}

export function parseMainnetDeploymentRecord(serialized: string): Readonly<{
  auctionHouse: `0x${string}`
  demoNft: `0x${string}`
  demoNftDeploymentTransactionHash: `0x${string}`
  remainingBudgetCeiling: bigint
}> {
  let parsed: Record<string, unknown>
  try {
    parsed = record(JSON.parse(serialized))
  } catch {
    throw new Error('Mainnet deployment record is invalid JSON')
  }
  if (parsed.schema !== 'cipherbid.mainnet-deployment.v1' || parsed.network !== 'mainnet') {
    throw new Error('Mainnet deployment record schema or network is invalid')
  }
  if (!sameFelt(parsed.chainId, MAINNET_CHAIN_ID)) throw new Error('Mainnet deployment chain ID mismatch')
  if (!sameFelt(parsed.deployer, MAINNET_DEPLOYER)) throw new Error('Mainnet deployment deployer mismatch')
  if (!sameFelt(parsed.auctionHouseClassHash, AUCTION_HOUSE_CLASS_HASH)) {
    throw new Error('Mainnet deployment AuctionHouse class mismatch')
  }
  if (!sameFelt(parsed.demoErc721ClassHash, DEMO_ERC721_CLASS_HASH)) {
    throw new Error('Mainnet deployment DemoERC721 class mismatch')
  }
  if (!sameFelt(parsed.strk20Pool, MAINNET_STRK20_POOL)) throw new Error('Mainnet deployment pool mismatch')
  if (!sameFelt(parsed.paymentToken, STRK_TOKEN)) throw new Error('Mainnet deployment payment token mismatch')
  if (typeof parsed.auctionHouse !== 'string' || !/^0x[0-9a-fA-F]+$/.test(parsed.auctionHouse)) {
    throw new Error('Mainnet deployment AuctionHouse address is invalid')
  }
  if (BigInt(parsed.auctionHouse) <= 0n) throw new Error('Mainnet deployment AuctionHouse address is zero')
  if (typeof parsed.demoNft !== 'string' || !/^0x[0-9a-fA-F]+$/.test(parsed.demoNft) || BigInt(parsed.demoNft) <= 0n) {
    throw new Error('Mainnet deployment DemoERC721 address is invalid')
  }
  if (
    typeof parsed.demoNftDeploymentTransactionHash !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(parsed.demoNftDeploymentTransactionHash) ||
    BigInt(parsed.demoNftDeploymentTransactionHash) <= 0n
  ) {
    throw new Error('Mainnet DemoERC721 deployment transaction is invalid')
  }
  if (typeof parsed.remainingBudgetCeiling !== 'string' || !/^\d+$/.test(parsed.remainingBudgetCeiling)) {
    throw new Error('Mainnet deployment remaining budget is invalid')
  }
  const remainingBudgetCeiling = BigInt(parsed.remainingBudgetCeiling)
  if (remainingBudgetCeiling <= 0n || remainingBudgetCeiling > MAINNET_MAXIMUM_BUDGET) {
    throw new Error('Mainnet deployment remaining budget is outside the frozen ceiling')
  }
  return Object.freeze({
    auctionHouse: parsed.auctionHouse as `0x${string}`,
    demoNft: parsed.demoNft as `0x${string}`,
    demoNftDeploymentTransactionHash: parsed.demoNftDeploymentTransactionHash as `0x${string}`,
    remainingBudgetCeiling,
  })
}

export function renderMainnetEnvironment(deployment: Readonly<{ auctionHouse: `0x${string}` }>): string {
  return [
    'NEXT_PUBLIC_CIPHERBID_NETWORK=mainnet',
    'NEXT_PUBLIC_STARKNET_RPC_URL=https://api.zan.top/public/starknet-mainnet/rpc/v0_10',
    `NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS=${deployment.auctionHouse}`,
    `NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH=${AUCTION_HOUSE_CLASS_HASH}`,
    `NEXT_PUBLIC_STRK20_POOL_ADDRESS=${MAINNET_STRK20_POOL}`,
    `NEXT_PUBLIC_STRK_TOKEN_ADDRESS=${STRK_TOKEN}`,
    '',
  ].join('\n')
}

export function buildMainnetAuctionCreationPlan(
  input: Readonly<{
    auctionHouse: `0x${string}`
    nftContract: `0x${string}`
    auctionId: bigint
    sellerClaimHandle: bigint
    nowSeconds: number
  }>,
) {
  return buildAuctionCreationPlan({
    auctionHouse: input.auctionHouse,
    nftContract: input.nftContract,
    tokenId: 99n,
    auctionId: input.auctionId,
    claimHandle: input.sellerClaimHandle,
    reserve: '1',
    cap: '4',
    nowSeconds: input.nowSeconds,
    biddingMinutes: 10,
    revealMinutes: 5,
    bidderLimit: 2,
  })
}
