const STRK_DECIMALS = 18
const MAX_U64 = (1n << 64n) - 1n
const MAX_U128 = (1n << 128n) - 1n
const MAX_U256 = (1n << 256n) - 1n
const CONTRACT_ADDRESS_BOUND = 1n << 251n
const STARK_FIELD_PRIME = (1n << 251n) + 17n * (1n << 192n) + 1n

type HexAddress = `0x${string}`

export type AuctionCreationPlanInput = Readonly<{
  auctionHouse: HexAddress
  nftContract: HexAddress
  tokenId: bigint
  auctionId: bigint
  claimHandle: bigint
  reserve: string
  cap: string
  nowSeconds: number
  biddingMinutes: number
  revealMinutes: number
  bidderLimit: number
}>

export type AuctionCreationForm = Readonly<{
  auctionId: string
  nftContract: HexAddress
  tokenId: string
  reservePrice: string
  cap: string
  biddingDeadline: string
  revealDeadline: string
  bidderLimit: string
  sellerClaimHandle: `0x${string}`
}>

function address(value: HexAddress, label: string): HexAddress {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(`${label} must be a hexadecimal Starknet address`)
  const parsed = BigInt(value)
  if (parsed <= 0n || parsed >= CONTRACT_ADDRESS_BOUND)
    throw new Error(`${label} is outside the Starknet address range`)
  return `0x${parsed.toString(16)}`
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`)
  return value
}

export function parseStrkAmount(value: string): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value)) {
    throw new Error('STRK amount must be a non-negative canonical decimal')
  }
  const [whole, fraction = ''] = value.split('.')
  if (fraction.length > STRK_DECIMALS) throw new Error(`STRK amount supports at most ${STRK_DECIMALS} decimal places`)
  const parsed = BigInt(whole) * 10n ** BigInt(STRK_DECIMALS) + BigInt(fraction.padEnd(STRK_DECIMALS, '0') || '0')
  if (parsed > MAX_U128) throw new Error('STRK amount exceeds u128')
  return parsed
}

export function buildAuctionCreationPlan(input: AuctionCreationPlanInput): Readonly<{
  form: AuctionCreationForm
  multicallTokens: readonly string[]
}> {
  const auctionHouse = address(input.auctionHouse, 'AuctionHouse')
  const nftContract = address(input.nftContract, 'NFT contract')
  if (input.tokenId < 0n || input.tokenId > MAX_U256) throw new Error('Token ID must fit u256')
  if (input.auctionId <= 0n || input.auctionId > MAX_U64) throw new Error('Auction ID must be between 1 and u64 max')
  if (input.claimHandle <= 0n || input.claimHandle >= STARK_FIELD_PRIME) {
    throw new Error('Seller claim handle must be a non-zero Stark field element')
  }
  const reservePrice = parseStrkAmount(input.reserve)
  const cap = parseStrkAmount(input.cap)
  if (reservePrice <= 0n) throw new Error('Auction reserve must be positive')
  if (cap < reservePrice) throw new Error('Auction reserve cannot exceed collateral cap')
  const biddingMinutes = positiveInteger(input.biddingMinutes, 'Bidding duration')
  const revealMinutes = positiveInteger(input.revealMinutes, 'Reveal duration')
  if (revealMinutes > 5) throw new Error('Reveal duration must be at most 5 minutes for the demo lifecycle')
  if (!Number.isSafeInteger(input.nowSeconds) || input.nowSeconds <= 0) throw new Error('Current timestamp is invalid')
  if (!Number.isSafeInteger(input.bidderLimit) || input.bidderLimit <= 0 || input.bidderLimit > 32) {
    throw new Error('Bidder limit must be between 1 and 32')
  }
  const biddingDeadline = BigInt(input.nowSeconds + biddingMinutes * 60)
  const revealDeadline = BigInt(Number(biddingDeadline) + revealMinutes * 60)
  if (revealDeadline > MAX_U64) throw new Error('Auction deadlines exceed u64')
  const lowMask = (1n << 128n) - 1n
  const tokenLow = input.tokenId & lowMask
  const tokenHigh = input.tokenId >> 128n
  const form: AuctionCreationForm = Object.freeze({
    auctionId: input.auctionId.toString(),
    nftContract,
    tokenId: input.tokenId.toString(),
    reservePrice: reservePrice.toString(),
    cap: cap.toString(),
    biddingDeadline: biddingDeadline.toString(),
    revealDeadline: revealDeadline.toString(),
    bidderLimit: input.bidderLimit.toString(),
    sellerClaimHandle: `0x${input.claimHandle.toString(16)}`,
  })
  return Object.freeze({
    form,
    multicallTokens: Object.freeze([
      'invoke',
      '--contract-address',
      nftContract,
      '--function',
      'approve',
      '--calldata',
      auctionHouse,
      tokenLow.toString(),
      tokenHigh.toString(),
      '/',
      'invoke',
      '--contract-address',
      auctionHouse,
      '--function',
      'create_auction',
      '--calldata',
      form.auctionId,
      form.sellerClaimHandle,
      nftContract,
      tokenLow.toString(),
      tokenHigh.toString(),
      form.reservePrice,
      form.cap,
      form.biddingDeadline,
      form.revealDeadline,
      form.bidderLimit,
    ]),
  })
}
