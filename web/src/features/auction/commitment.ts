import { hash, shortString } from 'starknet'

const STARK_FIELD_PRIME = 0x800000000000011000000000000000000000000000000000000000000000001n
const MAX_U64 = (1n << 64n) - 1n
const MAX_U128 = (1n << 128n) - 1n
const CLAIM_DOMAIN = BigInt(shortString.encodeShortString('CIPHERBID_CLAIM_V1'))
const BID_DOMAIN = BigInt(shortString.encodeShortString('CIPHERBID_BID_V1'))

export type BidCommitmentInput = Readonly<{
  chainId: bigint
  auctionHouse: bigint
  auctionId: bigint
  amount: bigint
  bidSecret: bigint
  claimHandle: bigint
  assetRecipient: bigint
}>

function assertFelt(name: string, value: bigint): void {
  if (value < 0n || value >= STARK_FIELD_PRIME) {
    throw new Error(`${name} must be a Starknet field element`)
  }
}

export function computeClaimHandle(claimSecret: bigint): bigint {
  assertFelt('claimSecret', claimSecret)
  if (claimSecret === 0n) throw new Error('Claim secret must be non-zero')
  return BigInt(hash.computePoseidonHashOnElements([CLAIM_DOMAIN, claimSecret]))
}

export function computeBidCommitment(input: BidCommitmentInput): bigint {
  assertFelt('chainId', input.chainId)
  assertFelt('auctionHouse', input.auctionHouse)
  assertFelt('bidSecret', input.bidSecret)
  assertFelt('claimHandle', input.claimHandle)
  assertFelt('assetRecipient', input.assetRecipient)

  if (input.chainId === 0n) throw new Error('Chain ID must be non-zero')
  if (input.auctionHouse === 0n) throw new Error('Auction house must be non-zero')
  if (input.auctionId < 0n || input.auctionId > MAX_U64) throw new Error('Auction ID must fit u64')
  if (input.amount <= 0n || input.amount > MAX_U128) throw new Error('Bid amount must be between 1 and u128 max')
  if (input.bidSecret === 0n) throw new Error('Bid secret must be non-zero')
  if (input.claimHandle === 0n) throw new Error('Claim handle must be non-zero')
  if (input.assetRecipient === 0n) throw new Error('Asset recipient must be non-zero')

  return BigInt(
    hash.computePoseidonHashOnElements([
      BID_DOMAIN,
      input.chainId,
      input.auctionHouse,
      input.auctionId,
      input.amount,
      input.bidSecret,
      input.claimHandle,
      input.assetRecipient,
    ]),
  )
}
