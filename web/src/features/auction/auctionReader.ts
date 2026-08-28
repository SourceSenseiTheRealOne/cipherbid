import type { DeploymentManifest } from '@/config/deployment'

export type ChainCall = Readonly<{
  contractAddress: string
  entrypoint: string
  calldata?: readonly string[]
}>

export type ChainReader = Readonly<{
  callContract: (call: ChainCall) => Promise<readonly string[] | Readonly<{ result: readonly string[] }>>
  getClassHashAt: (contractAddress: string) => Promise<string>
}>

export type AuctionConfigSnapshot = Readonly<{
  auctionId: bigint
  seller: `0x${string}`
  sellerClaimHandle: bigint
  nftContract: `0x${string}`
  tokenId: bigint
  reservePrice: bigint
  cap: bigint
  biddingDeadline: bigint
  revealDeadline: bigint
  bidderLimit: number
}>

export type AuctionStateSnapshot = Readonly<{
  settled: boolean
  sold: boolean
  winnerIndex: number
  winnerCommitment: bigint
  winnerRecipient: `0x${string}`
  clearingPrice: bigint
  sellerEntitlement: bigint
  sellerAuthorizedNote: bigint
  sellerClaimConsumed: boolean
}>

export type BidSnapshot = Readonly<{
  commitment: bigint
  claimHandle: bigint
  revealed: boolean
  amount: bigint
  assetRecipient: `0x${string}`
}>

const MAX_SUPPORTED_BIDDERS = 32

function normalizeHex(value: string, label: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(`${label} is not hexadecimal`)
  return `0x${BigInt(value).toString(16)}`
}

function felt(value: string, label: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(`${label} is not a felt`)
  return BigInt(value)
}

function boundedNumber(value: string, label: string, maximum = Number.MAX_SAFE_INTEGER): number {
  const parsed = felt(value, label)
  if (parsed < 0n || parsed > BigInt(maximum)) throw new Error(`${label} is outside its bounded maximum`)
  return Number(parsed)
}

function bool(value: string, label: string): boolean {
  const parsed = felt(value, label)
  if (parsed !== 0n && parsed !== 1n) throw new Error(`${label} is not a Cairo bool`)
  return parsed === 1n
}

function expectLength(result: readonly string[], length: number, label: string): void {
  if (result.length !== length) throw new Error(`${label} returned ${result.length} felts; expected ${length}`)
}

function resultOf(value: readonly string[] | Readonly<{ result: readonly string[] }>): readonly string[] {
  return 'result' in value ? value.result : value
}

async function call(reader: ChainReader, request: ChainCall): Promise<readonly string[]> {
  return resultOf(await reader.callContract(request))
}

function encode(value: bigint | number): string {
  return `0x${BigInt(value).toString(16)}`
}

function sameFelt(left: string, right: string): boolean {
  return BigInt(left) === BigInt(right)
}

export async function readAndValidateDeployment(reader: ChainReader, manifest: DeploymentManifest) {
  const [classHashRaw, houseResult] = await Promise.all([
    reader.getClassHashAt(manifest.auctionHouse),
    call(reader, { contractAddress: manifest.auctionHouse, entrypoint: 'get_house_config' }),
  ])
  const classHash = normalizeHex(classHashRaw, 'Auction house class hash')
  if (!sameFelt(classHash, manifest.auctionHouseClassHash)) throw new Error('Auction house class hash does not match manifest')
  expectLength(houseResult, 3, 'get_house_config')
  const pool = normalizeHex(houseResult[0], 'Configured pool')
  const paymentToken = normalizeHex(houseResult[1], 'Configured payment token')
  const maxBidders = boundedNumber(houseResult[2], 'Configured bidder bound', MAX_SUPPORTED_BIDDERS)
  if (maxBidders === 0) throw new Error('Configured bidder bound is zero')
  if (!sameFelt(pool, manifest.strk20Pool)) throw new Error('Configured STRK20 pool does not match manifest')
  if (!sameFelt(paymentToken, manifest.paymentToken)) throw new Error('Configured payment token does not match manifest')

  return Object.freeze({
    pool: manifest.strk20Pool,
    paymentToken: manifest.paymentToken,
    maxBidders,
    classHash: manifest.auctionHouseClassHash,
  })
}

function parseAuctionConfig(result: readonly string[]): AuctionConfigSnapshot {
  expectLength(result, 11, 'get_auction_config')
  return Object.freeze({
    auctionId: felt(result[0], 'auction_id'),
    seller: normalizeHex(result[1], 'seller'),
    sellerClaimHandle: felt(result[2], 'seller_claim_handle'),
    nftContract: normalizeHex(result[3], 'nft_contract'),
    tokenId: felt(result[4], 'token_id.low') + (felt(result[5], 'token_id.high') << 128n),
    reservePrice: felt(result[6], 'reserve_price'),
    cap: felt(result[7], 'cap'),
    biddingDeadline: felt(result[8], 'bidding_deadline'),
    revealDeadline: felt(result[9], 'reveal_deadline'),
    bidderLimit: boundedNumber(result[10], 'bidder_limit', MAX_SUPPORTED_BIDDERS),
  })
}

function parseAuctionState(result: readonly string[]): AuctionStateSnapshot {
  expectLength(result, 9, 'get_auction_state')
  return Object.freeze({
    settled: bool(result[0], 'settled'),
    sold: bool(result[1], 'sold'),
    winnerIndex: boundedNumber(result[2], 'winner_index', MAX_SUPPORTED_BIDDERS - 1),
    winnerCommitment: felt(result[3], 'winner_commitment'),
    winnerRecipient: normalizeHex(result[4], 'winner_recipient'),
    clearingPrice: felt(result[5], 'clearing_price'),
    sellerEntitlement: felt(result[6], 'seller_entitlement'),
    sellerAuthorizedNote: felt(result[7], 'seller_authorized_note'),
    sellerClaimConsumed: bool(result[8], 'seller_claim_consumed'),
  })
}

function parseBid(result: readonly string[]): BidSnapshot {
  expectLength(result, 5, 'get_bid')
  return Object.freeze({
    commitment: felt(result[0], 'commitment'),
    claimHandle: felt(result[1], 'claim_handle'),
    revealed: bool(result[2], 'revealed'),
    amount: felt(result[3], 'amount'),
    assetRecipient: normalizeHex(result[4], 'asset_recipient'),
  })
}

export async function readAuctionSnapshot(reader: ChainReader, manifest: DeploymentManifest, auctionId: bigint) {
  if (auctionId <= 0n) throw new Error('Auction ID must be positive')
  const deployment = await readAndValidateDeployment(reader, manifest)
  const auctionCalldata = [encode(auctionId)]
  const [configResult, stateResult, countResult] = await Promise.all([
    call(reader, {
      contractAddress: manifest.auctionHouse,
      entrypoint: 'get_auction_config',
      calldata: auctionCalldata,
    }),
    call(reader, {
      contractAddress: manifest.auctionHouse,
      entrypoint: 'get_auction_state',
      calldata: auctionCalldata,
    }),
    call(reader, {
      contractAddress: manifest.auctionHouse,
      entrypoint: 'get_bid_count',
      calldata: auctionCalldata,
    }),
  ])
  const config = parseAuctionConfig(configResult)
  const state = parseAuctionState(stateResult)
  expectLength(countResult, 1, 'get_bid_count')
  const bidCount = boundedNumber(countResult[0], 'Bid count', deployment.maxBidders)
  if (bidCount > config.bidderLimit) throw new Error('Bid count exceeds immutable auction bidder limit')

  const bids = await Promise.all(
    Array.from({ length: bidCount }, (_, acceptedIndex) =>
      call(reader, {
        contractAddress: manifest.auctionHouse,
        entrypoint: 'get_bid',
        calldata: [encode(auctionId), encode(acceptedIndex)],
      }).then(parseBid),
    ),
  )
  const ownerResult = await call(reader, {
    contractAddress: config.nftContract,
    entrypoint: 'owner_of',
    calldata: [encode(config.tokenId & ((1n << 128n) - 1n)), encode(config.tokenId >> 128n)],
  })
  expectLength(ownerResult, 1, 'owner_of')
  const nftOwner = normalizeHex(ownerResult[0], 'NFT owner')
  const expectedOwner = !state.settled
    ? manifest.auctionHouse
    : state.sold
      ? state.winnerRecipient
      : config.seller
  const custodyValid = sameFelt(nftOwner, expectedOwner)
  if (!custodyValid) throw new Error('NFT custody does not match auction lifecycle state')

  return Object.freeze({ config, state, bids: Object.freeze(bids), nftOwner, custodyValid })
}
