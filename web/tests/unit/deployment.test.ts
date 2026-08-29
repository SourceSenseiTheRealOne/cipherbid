import { describe, expect, it } from 'vitest'
import {
  MAINNET_CHAIN_ID,
  MAINNET_STRK20_POOL,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_STRK20_POOL,
  STRK_TOKEN,
  loadDeploymentManifest,
} from '@/config/deployment'

const base = {
  NEXT_PUBLIC_CIPHERBID_NETWORK: 'sepolia',
  NEXT_PUBLIC_STARKNET_RPC_URL: 'https://rpc.example/sepolia',
  NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: '0x123',
  NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: '0x456',
  NEXT_PUBLIC_STRK20_POOL_ADDRESS: SEPOLIA_STRK20_POOL,
  NEXT_PUBLIC_STRK_TOKEN_ADDRESS: STRK_TOKEN,
}

describe('deployment manifest', () => {
  it('loads an explicit canonical Sepolia deployment', () => {
    expect(loadDeploymentManifest(base)).toEqual({
      network: 'sepolia',
      chainId: SEPOLIA_CHAIN_ID,
      rpcUrl: 'https://rpc.example/sepolia',
      auctionHouse: '0x123',
      auctionHouseClassHash: '0x456',
      strk20Pool: SEPOLIA_STRK20_POOL,
      paymentToken: STRK_TOKEN,
    })
  })

  it('loads an explicit canonical mainnet deployment', () => {
    expect(
      loadDeploymentManifest({
        ...base,
        NEXT_PUBLIC_CIPHERBID_NETWORK: 'mainnet',
        NEXT_PUBLIC_STARKNET_RPC_URL: 'https://rpc.example/mainnet',
        NEXT_PUBLIC_STRK20_POOL_ADDRESS: MAINNET_STRK20_POOL,
      }),
    ).toMatchObject({
      network: 'mainnet',
      chainId: MAINNET_CHAIN_ID,
      strk20Pool: MAINNET_STRK20_POOL,
      paymentToken: STRK_TOKEN,
    })
  })

  it('rejects missing, unsupported, malformed, or mismatched configuration', () => {
    expect(() => loadDeploymentManifest({ ...base, NEXT_PUBLIC_CIPHERBID_NETWORK: undefined })).toThrow(
      'NEXT_PUBLIC_CIPHERBID_NETWORK',
    )
    expect(() => loadDeploymentManifest({ ...base, NEXT_PUBLIC_CIPHERBID_NETWORK: 'devnet' })).toThrow(
      'Unsupported CipherBid network',
    )
    expect(() => loadDeploymentManifest({ ...base, NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS: 'not-hex' })).toThrow(
      'NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS',
    )
    expect(() => loadDeploymentManifest({ ...base, NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH: '0x0' })).toThrow(
      'NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH',
    )
    expect(() => loadDeploymentManifest({ ...base, NEXT_PUBLIC_STARKNET_RPC_URL: 'file:///tmp/rpc' })).toThrow(
      'NEXT_PUBLIC_STARKNET_RPC_URL',
    )
    expect(() => loadDeploymentManifest({ ...base, NEXT_PUBLIC_STRK20_POOL_ADDRESS: '0x999' })).toThrow(
      'STRK20 pool does not match',
    )
    expect(() => loadDeploymentManifest({ ...base, NEXT_PUBLIC_STRK_TOKEN_ADDRESS: '0x999' })).toThrow(
      'STRK token does not match',
    )
  })
})
