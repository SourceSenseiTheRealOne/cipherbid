import type { DeploymentManifest } from '@/config/deployment'
import type { readAuctionSnapshot } from '@/features/auction/auctionReader'
import type { AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'

type AuctionSnapshot = Awaited<ReturnType<typeof readAuctionSnapshot>>

function hex(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`
}

export function toAuctionLiveViewModel(manifest: DeploymentManifest, snapshot: AuctionSnapshot): AuctionLiveViewModel {
  return {
    network: manifest.network,
    chainId: manifest.chainId,
    rpcUrl: manifest.rpcUrl,
    auctionHouse: manifest.auctionHouse,
    auctionHouseClassHash: manifest.auctionHouseClassHash,
    strk20Pool: manifest.strk20Pool,
    paymentToken: manifest.paymentToken,
    auctionId: snapshot.config.auctionId.toString(),
    seller: snapshot.config.seller,
    sellerClaimHandle: hex(snapshot.config.sellerClaimHandle),
    nftContract: snapshot.config.nftContract,
    tokenId: snapshot.config.tokenId.toString(),
    reservePrice: snapshot.config.reservePrice.toString(),
    cap: snapshot.config.cap.toString(),
    biddingDeadline: snapshot.config.biddingDeadline.toString(),
    revealDeadline: snapshot.config.revealDeadline.toString(),
    bidderLimit: snapshot.config.bidderLimit,
    nftOwner: snapshot.nftOwner,
    custodyValid: snapshot.custodyValid,
    state: {
      settled: snapshot.state.settled,
      sold: snapshot.state.sold,
      winnerIndex: snapshot.state.winnerIndex,
      winnerCommitment: hex(snapshot.state.winnerCommitment),
      winnerRecipient: snapshot.state.winnerRecipient,
      clearingPrice: snapshot.state.clearingPrice.toString(),
      sellerEntitlement: snapshot.state.sellerEntitlement.toString(),
      sellerAuthorizedNote: hex(snapshot.state.sellerAuthorizedNote),
      sellerClaimConsumed: snapshot.state.sellerClaimConsumed,
    },
    bids: snapshot.bids.map((bid) => ({
      commitment: hex(bid.commitment),
      claimHandle: hex(bid.claimHandle),
      revealed: bid.revealed,
      amount: bid.amount.toString(),
      assetRecipient: bid.assetRecipient,
    })),
  }
}
