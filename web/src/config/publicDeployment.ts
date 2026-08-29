import { loadDeploymentManifest, type DeploymentManifest } from '@/config/deployment'

export function loadPublicDeploymentManifest(): DeploymentManifest {
  return loadDeploymentManifest({
    NEXT_PUBLIC_CIPHERBID_NETWORK: process.env.NEXT_PUBLIC_CIPHERBID_NETWORK,
    NEXT_PUBLIC_STARKNET_RPC_URL: process.env.NEXT_PUBLIC_STARKNET_RPC_URL,
    NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: process.env.NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS,
    NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: process.env.NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH,
    NEXT_PUBLIC_STRK20_POOL_ADDRESS: process.env.NEXT_PUBLIC_STRK20_POOL_ADDRESS,
    NEXT_PUBLIC_STRK_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS,
  })
}
