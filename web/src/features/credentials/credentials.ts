import {
  CONTRACT_ADDRESS_BOUND,
  MAX_U128,
  MAX_U64,
  STARK_FIELD_PRIME,
  computeBidCommitment,
  computeClaimHandle,
} from '@/features/auction/commitment'

export type CredentialNetwork = 'sepolia' | 'mainnet'

export type CredentialBinding = Readonly<{
  network: CredentialNetwork
  chainId: bigint
  auctionHouse: bigint
  auctionId: bigint
}>

export type SellerCredential = Readonly<
  CredentialBinding & {
    schema: 'cipherbid.credential.v1'
    role: 'seller'
    claimSecret: bigint
    claimHandle: bigint
  }
>

export type BidderCredential = Readonly<
  CredentialBinding & {
    schema: 'cipherbid.credential.v1'
    role: 'bidder'
    claimSecret: bigint
    claimHandle: bigint
    bidNonce: bigint
    amount: bigint
    assetRecipient: bigint
    commitment: bigint
    acceptedIndex?: number
  }
>

export type CipherBidCredential = SellerCredential | BidderCredential
export type RandomFill = (target: Uint8Array) => void | Uint8Array

function assertFelt(name: string, value: bigint, allowZero = false): void {
  if (value < 0n || value >= STARK_FIELD_PRIME || (!allowZero && value === 0n)) {
    throw new Error(`${name} must be a ${allowZero ? '' : 'non-zero '}Stark field element`)
  }
}

function assertAddress(name: string, value: bigint): void {
  if (value <= 0n || value >= CONTRACT_ADDRESS_BOUND) {
    throw new Error(`${name} must be a non-zero Starknet contract address`)
  }
}

function validateBinding(binding: CredentialBinding): void {
  if (binding.network !== 'sepolia' && binding.network !== 'mainnet') throw new Error('Unsupported credential network')
  assertFelt('chainId', binding.chainId)
  assertAddress('auctionHouse', binding.auctionHouse)
  if (binding.auctionId <= 0n || binding.auctionId > MAX_U64) {
    throw new Error('auctionId must be between 1 and u64 max')
  }
}

export function createSellerCredential(input: CredentialBinding & Readonly<{ claimSecret: bigint }>): SellerCredential {
  validateBinding(input)
  const claimHandle = computeClaimHandle(input.claimSecret)
  return Object.freeze({
    schema: 'cipherbid.credential.v1',
    role: 'seller',
    network: input.network,
    chainId: input.chainId,
    auctionHouse: input.auctionHouse,
    auctionId: input.auctionId,
    claimSecret: input.claimSecret,
    claimHandle,
  })
}

export function createBidderCredential(
  input: CredentialBinding &
    Readonly<{
      claimSecret: bigint
      bidNonce: bigint
      amount: bigint
      assetRecipient: bigint
    }>,
): BidderCredential {
  validateBinding(input)
  assertFelt('Bid nonce', input.bidNonce)
  if (input.amount <= 0n || input.amount > MAX_U128) throw new Error('Bid amount must be between 1 and u128 max')
  assertAddress('assetRecipient', input.assetRecipient)
  const claimHandle = computeClaimHandle(input.claimSecret)
  const commitment = computeBidCommitment({
    chainId: input.chainId,
    auctionHouse: input.auctionHouse,
    auctionId: input.auctionId,
    amount: input.amount,
    bidNonce: input.bidNonce,
    claimHandle,
    assetRecipient: input.assetRecipient,
  })
  return Object.freeze({
    schema: 'cipherbid.credential.v1',
    role: 'bidder',
    network: input.network,
    chainId: input.chainId,
    auctionHouse: input.auctionHouse,
    auctionId: input.auctionId,
    claimSecret: input.claimSecret,
    claimHandle,
    bidNonce: input.bidNonce,
    amount: input.amount,
    assetRecipient: input.assetRecipient,
    commitment,
  })
}

export function bindAcceptedIndex(credential: BidderCredential, acceptedIndex: number): BidderCredential {
  if (!Number.isSafeInteger(acceptedIndex) || acceptedIndex < 0 || acceptedIndex >= 32) {
    throw new Error('Accepted index must be an integer between 0 and 31')
  }
  return Object.freeze({ ...credential, acceptedIndex })
}

function littleEndianBigInt(bytes: Uint8Array): bigint {
  let value = 0n
  for (let index = bytes.length - 1; index >= 0; index -= 1) value = (value << 8n) | BigInt(bytes[index])
  return value
}

export function generateNonZeroFelt(fill?: RandomFill): bigint {
  const randomFill: RandomFill =
    fill ??
    ((target) => {
      if (!globalThis.crypto?.getRandomValues) throw new Error('Secure browser randomness is unavailable')
      globalThis.crypto.getRandomValues(target)
    })
  const bytes = new Uint8Array(32)
  for (;;) {
    bytes.fill(0)
    randomFill(bytes)
    const value = littleEndianBigInt(bytes)
    if (value > 0n && value < STARK_FIELD_PRIME) {
      bytes.fill(0)
      return value
    }
  }
}

export function generateSellerCredential(binding: CredentialBinding, fill?: RandomFill): SellerCredential {
  return createSellerCredential({ ...binding, claimSecret: generateNonZeroFelt(fill) })
}

export function generateBidderCredential(
  input: CredentialBinding & Readonly<{ amount: bigint; assetRecipient: bigint }>,
  fill?: RandomFill,
): BidderCredential {
  const claimSecret = generateNonZeroFelt(fill)
  const bidNonce = generateNonZeroFelt(fill)
  return createBidderCredential({ ...input, claimSecret, bidNonce })
}
