import { num, type Call } from 'starknet'
import type { HexAddress } from '@/features/privacy/strk20Actions'

export type RevealBidCallInput = Readonly<{
  auctionId: bigint
  acceptedIndex: bigint
  amount: bigint
  bidNonce: bigint
  assetRecipient: HexAddress
  auctionHouse: HexAddress
}>

export type AuctionCallInput = Readonly<{
  auctionId: bigint
  auctionHouse: HexAddress
}>

export type SellerProceedsAuthorizationCallInput = AuctionCallInput &
  Readonly<{
    claimHandle: bigint
    openNoteId: bigint
  }>

const felt = (value: bigint) => num.toHex(value)

export function buildRevealBidCall(input: RevealBidCallInput): Call {
  return {
    contractAddress: input.auctionHouse,
    entrypoint: 'reveal_bid',
    calldata: [
      felt(input.auctionId),
      felt(input.acceptedIndex),
      felt(input.amount),
      felt(input.bidNonce),
      input.assetRecipient,
    ],
  }
}

export function buildSettleAuctionCall(input: AuctionCallInput): Call {
  return {
    contractAddress: input.auctionHouse,
    entrypoint: 'settle_auction',
    calldata: [felt(input.auctionId)],
  }
}

export function buildAuthorizeSellerProceedsCall(input: SellerProceedsAuthorizationCallInput): Call {
  return {
    contractAddress: input.auctionHouse,
    entrypoint: 'authorize_seller_proceeds',
    calldata: [felt(input.auctionId), felt(input.claimHandle), felt(input.openNoteId)],
  }
}
