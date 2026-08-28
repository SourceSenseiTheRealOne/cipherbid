import { RpcProvider } from 'starknet'
import { AuctionLivePage, type AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'
import { readAuctionSnapshot, type ChainReader } from '@/features/auction/auctionReader'
import { loadDeploymentManifest } from '@/config/deployment'

export const dynamic = 'force-dynamic'

function parseAuctionId(value: string): bigint | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }
  if (!/^[1-9][0-9]{0,19}$/.test(decoded)) return null
  const auctionId = BigInt(decoded)
  return auctionId <= (1n << 64n) - 1n ? auctionId : null
}

function hex(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`
}

function viewModel(
  network: 'sepolia' | 'mainnet',
  chainId: string,
  rpcUrl: string,
  auctionHouse: string,
  auctionHouseClassHash: string,
  strk20Pool: string,
  paymentToken: string,
  snapshot: Awaited<ReturnType<typeof readAuctionSnapshot>>,
): AuctionLiveViewModel {
  return {
    network,
    chainId,
    rpcUrl,
    auctionHouse,
    auctionHouseClassHash,
    strk20Pool,
    paymentToken,
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

export default async function AuctionPage({
  params,
}: Readonly<{
  params: Promise<{ auctionId: string }>
}>) {
  const { auctionId: routeAuctionId } = await params
  const auctionId = parseAuctionId(routeAuctionId)
  if (auctionId === null) {
    return <AuctionLivePage error="Auction ID must be a positive u64 decimal value." auctionId={routeAuctionId.slice(0, 80)} />
  }

  try {
    const manifest = loadDeploymentManifest(process.env)
    const provider = new RpcProvider({ nodeUrl: manifest.rpcUrl })
    const reader: ChainReader = {
      callContract: (call) => provider.callContract({ ...call, calldata: call.calldata ? [...call.calldata] : [] }),
      getClassHashAt: (address) => provider.getClassHashAt(address),
    }
    const snapshot = await readAuctionSnapshot(reader, manifest, auctionId)
    return (
      <AuctionLivePage
        model={viewModel(
          manifest.network,
          manifest.chainId,
          manifest.rpcUrl,
          manifest.auctionHouse,
          manifest.auctionHouseClassHash,
          manifest.strk20Pool,
          manifest.paymentToken,
          snapshot,
        )}
      />
    )
  } catch {
    return (
      <AuctionLivePage
        error="Auction deployment is not configured or the requested onchain state could not be read."
        auctionId={auctionId.toString()}
      />
    )
  }
}
