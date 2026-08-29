import { RpcProvider } from 'starknet'
import { loadPublicDeploymentManifest } from '@/config/publicDeployment'
import { toAuctionLiveViewModel } from '@/features/auction/auctionLiveViewModel'
import { readAuctionSnapshot, type ChainReader } from '@/features/auction/auctionReader'
import type { AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'

export async function loadAuctionLiveViewModel(auctionId: bigint): Promise<AuctionLiveViewModel> {
  const manifest = loadPublicDeploymentManifest()
  const provider = new RpcProvider({ nodeUrl: manifest.rpcUrl })
  const reader: ChainReader = {
    callContract: (call) => provider.callContract({ ...call, calldata: call.calldata ? [...call.calldata] : [] }),
    getClassHashAt: (address) => provider.getClassHashAt(address),
  }
  const snapshot = await readAuctionSnapshot(reader, manifest, auctionId)
  return toAuctionLiveViewModel(manifest, snapshot)
}
