export type AuctionPhase =
  | 'BiddingOpen'
  | 'RevealOpen'
  | 'ReadyToSettle'
  | 'SettledSold'
  | 'SettledNoSale'
  | 'ClaimsComplete'

export type SettlementStatus = 'sold' | 'no_sale'

export type AuctionPhaseInput = Readonly<{
  now: bigint
  biddingDeadline: bigint
  revealDeadline: bigint
  settlement?: SettlementStatus
  claimsComplete?: boolean
}>

export type AcceptedBid = Readonly<{
  acceptedIndex: number
  commitment: bigint
  amount: bigint | null
}>

export type BidderClaim = Readonly<{
  acceptedIndex: number
  kind: 'loser_refund' | 'winner_surplus'
  amount: bigint
}>

export type VickreySettlement = Readonly<{
  sold: boolean
  winnerIndex: number | null
  winnerCommitment: bigint | null
  clearingPrice: bigint
  bidderClaims: readonly BidderClaim[]
  sellerEntitlement: bigint
  winnerClaimAutoConsumed: boolean
  lockedCollateral: bigint
  distributedValue: bigint
}>

export function deriveAuctionPhase(input: AuctionPhaseInput): AuctionPhase {
  if (input.now < 0n || input.biddingDeadline < 0n || input.revealDeadline < 0n) {
    throw new Error('Auction timestamps must be unsigned')
  }
  if (input.biddingDeadline >= input.revealDeadline) {
    throw new Error('Bidding deadline must precede reveal deadline')
  }
  if (input.claimsComplete && !input.settlement) {
    throw new Error('Claims cannot complete before settlement')
  }
  if (input.claimsComplete) return 'ClaimsComplete'
  if (input.settlement === 'sold') return 'SettledSold'
  if (input.settlement === 'no_sale') return 'SettledNoSale'
  if (input.now < input.biddingDeadline) return 'BiddingOpen'
  if (input.now < input.revealDeadline) return 'RevealOpen'
  return 'ReadyToSettle'
}

export function settleVickrey(
  input: Readonly<{ reserve: bigint; cap: bigint; bids: readonly AcceptedBid[] }>,
): VickreySettlement {
  if (input.reserve <= 0n || input.cap <= 0n || input.reserve > input.cap) {
    throw new Error('Settlement requires 0 < reserve <= cap')
  }

  const indices = new Set<number>()
  const commitments = new Set<bigint>()
  for (const bid of input.bids) {
    if (!Number.isInteger(bid.acceptedIndex) || bid.acceptedIndex < 0 || indices.has(bid.acceptedIndex)) {
      throw new Error('Accepted bid indices must be unique non-negative integers')
    }
    if (bid.commitment <= 0n || commitments.has(bid.commitment)) {
      throw new Error('Commitments must be unique and non-zero')
    }
    if (bid.amount !== null && (bid.amount <= 0n || bid.amount > input.cap)) {
      throw new Error('Revealed amount must be between 1 and cap')
    }
    indices.add(bid.acceptedIndex)
    commitments.add(bid.commitment)
  }

  const revealed = input.bids
    .filter((bid): bid is AcceptedBid & Readonly<{ amount: bigint }> => bid.amount !== null)
    .sort((left, right) => {
      if (left.amount === right.amount) return left.acceptedIndex - right.acceptedIndex
      return left.amount > right.amount ? -1 : 1
    })

  const highest = revealed[0]
  const sold = highest !== undefined && highest.amount >= input.reserve
  const secondHighest = revealed[1]?.amount ?? 0n
  const clearingPrice = sold ? (secondHighest > input.reserve ? secondHighest : input.reserve) : 0n
  const winnerIndex = sold ? highest.acceptedIndex : null
  const winnerCommitment = sold ? highest.commitment : null

  const bidderClaims: BidderClaim[] = []
  let winnerClaimAutoConsumed = false
  for (const bid of [...input.bids].sort((left, right) => left.acceptedIndex - right.acceptedIndex)) {
    if (sold && bid.acceptedIndex === winnerIndex) {
      const surplus = input.cap - clearingPrice
      if (surplus > 0n) {
        bidderClaims.push({ acceptedIndex: bid.acceptedIndex, kind: 'winner_surplus', amount: surplus })
      } else {
        winnerClaimAutoConsumed = true
      }
    } else {
      bidderClaims.push({ acceptedIndex: bid.acceptedIndex, kind: 'loser_refund', amount: input.cap })
    }
  }

  const sellerEntitlement = clearingPrice
  const lockedCollateral = input.cap * BigInt(input.bids.length)
  const distributedValue = bidderClaims.reduce((total, claim) => total + claim.amount, sellerEntitlement)
  if (distributedValue !== lockedCollateral) {
    throw new Error('Settlement does not conserve collateral')
  }

  return Object.freeze({
    sold,
    winnerIndex,
    winnerCommitment,
    clearingPrice,
    bidderClaims: Object.freeze(bidderClaims),
    sellerEntitlement,
    winnerClaimAutoConsumed,
    lockedCollateral,
    distributedValue,
  })
}
