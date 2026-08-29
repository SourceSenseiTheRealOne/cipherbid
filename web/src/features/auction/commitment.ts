import { hash, shortString } from 'starknet'

export const STARK_FIELD_PRIME = 0x800000000000011000000000000000000000000000000000000000000000001n
export const CONTRACT_ADDRESS_BOUND = 1n << 251n
export const MAX_U64 = (1n << 64n) - 1n
export const MAX_U128 = (1n << 128n) - 1n
export const CLAIM_DOMAIN = BigInt(shortString.encodeShortString('CIPHERBID_CLAIM_V1'))
export const BID_DOMAIN = BigInt(shortString.encodeShortString('CIPHERBID_BID_V1'))

export type BidCommitmentInput = Readonly<{
  chainId: bigint
  auctionHouse: bigint
  auctionId: bigint
  amount: bigint
  bidNonce: bigint
  claimHandle: bigint
  assetRecipient: bigint
}>

function assertFelt(name: string, value: bigint): void {
  if (value < 0n || value >= STARK_FIELD_PRIME) {
    throw new Error(`${name} must be a Starknet field element`)
  }
}

function assertContractAddress(name: string, value: bigint): void {
  if (value <= 0n || value >= CONTRACT_ADDRESS_BOUND) {
    throw new Error(`${name} must be a non-zero Starknet contract address`)
  }
}

export function computeClaimHandle(claimSecret: bigint): bigint {
  assertFelt('claimSecret', claimSecret)
  if (claimSecret === 0n) throw new Error('Claim secret must be non-zero')
  return BigInt(hash.computePoseidonHashOnElements([CLAIM_DOMAIN, claimSecret]))
}

export function computeBidCommitment(input: BidCommitmentInput): bigint {
  assertFelt('chainId', input.chainId)
  assertContractAddress('auctionHouse', input.auctionHouse)
  assertFelt('bidNonce', input.bidNonce)
  assertFelt('claimHandle', input.claimHandle)
  assertContractAddress('assetRecipient', input.assetRecipient)

  if (input.chainId === 0n) throw new Error('Chain ID must be non-zero')
  if (input.auctionId <= 0n || input.auctionId > MAX_U64) throw new Error('Auction ID must be between 1 and u64 max')
  if (input.amount <= 0n || input.amount > MAX_U128) throw new Error('Bid amount must be between 1 and u128 max')
  if (input.bidNonce === 0n) throw new Error('Bid nonce must be non-zero')
  if (input.claimHandle === 0n) throw new Error('Claim handle must be non-zero')

  return BigInt(
    hash.computePoseidonHashOnElements([
      BID_DOMAIN,
      input.chainId,
      input.auctionHouse,
      input.auctionId,
      input.amount,
      input.bidNonce,
      input.claimHandle,
      input.assetRecipient,
    ]),
  )
}
