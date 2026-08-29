import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAINNET_CHAIN_ID, MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'
import { loadPublicDeploymentManifest } from '@/config/publicDeployment'

const mainnetEnvironment = {
  NEXT_PUBLIC_CIPHERBID_NETWORK: 'mainnet',
  NEXT_PUBLIC_STARKNET_RPC_URL: 'https://rpc.example/mainnet',
  NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: '0x123',
  NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: '0x456',
  NEXT_PUBLIC_STRK20_POOL_ADDRESS: MAINNET_STRK20_POOL,
  NEXT_PUBLIC_STRK_TOKEN_ADDRESS: STRK_TOKEN,
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('public deployment manifest', () => {
  it('loads the exact statically referenced public mainnet environment', () => {
    for (const [key, value] of Object.entries(mainnetEnvironment)) vi.stubEnv(key, value)

    expect(loadPublicDeploymentManifest()).toEqual({
      network: 'mainnet',
      chainId: MAINNET_CHAIN_ID,
      rpcUrl: 'https://rpc.example/mainnet',
      auctionHouse: '0x123',
      auctionHouseClassHash: '0x456',
      strk20Pool: MAINNET_STRK20_POOL,
      paymentToken: STRK_TOKEN,
    })
  })

  it('fails closed when a public deployment value is absent or noncanonical', () => {
    for (const [key, value] of Object.entries(mainnetEnvironment)) vi.stubEnv(key, value)
    vi.stubEnv('NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS', '')
    expect(() => loadPublicDeploymentManifest()).toThrow('NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS')

    vi.stubEnv('NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS', '0x123')
    vi.stubEnv('NEXT_PUBLIC_STRK20_POOL_ADDRESS', '0x999')
    expect(() => loadPublicDeploymentManifest()).toThrow('STRK20 pool does not match')
  })
})
