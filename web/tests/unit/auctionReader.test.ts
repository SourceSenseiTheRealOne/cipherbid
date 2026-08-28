import { describe, expect, it } from 'vitest'
import type { DeploymentManifest } from '@/config/deployment'
import { readAuctionSnapshot, readAndValidateDeployment, type ChainReader } from '@/features/auction/auctionReader'

const manifest: DeploymentManifest = {
  network: 'sepolia',
  chainId: '0x534e5f5345504f4c4941',
  rpcUrl: 'https://rpc.example/sepolia',
  auctionHouse: '0x123',
  auctionHouseClassHash: '0x456',
  strk20Pool: '0x254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91',
  paymentToken: '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
}

function reader(overrides: Partial<Record<string, readonly string[]>> = {}): ChainReader {
  const results: Record<string, readonly string[]> = {
    '0x123:get_house_config': [manifest.strk20Pool, manifest.paymentToken, '0x20'],
    '0x123:get_auction_config': [
      '0x7',
      '0x777',
      '0xabc',
      '0x999',
      '0x63',
      '0x0',
      '0x2',
      '0x5',
      '0x64',
      '0xc8',
      '0x2',
    ],
    '0x123:get_auction_state': ['0x1', '0x1', '0x1', '0x222', '0x888', '0x3', '0x3', '0x903', '0x0'],
    '0x123:get_bid_count': ['0x2'],
    '0x123:get_bid:0x0': ['0x111', '0xa11', '0x1', '0x3', '0x887'],
    '0x123:get_bid:0x1': ['0x222', '0xa22', '0x1', '0x4', '0x888'],
    '0x999:owner_of': ['0x888'],
    ...overrides,
  }

  return {
    getClassHashAt: async () => manifest.auctionHouseClassHash,
    callContract: async ({ contractAddress, entrypoint, calldata = [] }) => {
      const key = `${contractAddress}:${entrypoint}${entrypoint === 'get_bid' ? `:${calldata[1]}` : ''}`
      const result = results[key]
      if (!result) throw new Error(`Missing fake result for ${key}`)
      return result
    },
  }
}

describe('auction reader', () => {
  it('validates deployment identity and returns bounded live auction state', async () => {
    await expect(readAndValidateDeployment(reader(), manifest)).resolves.toEqual({
      pool: manifest.strk20Pool,
      paymentToken: manifest.paymentToken,
      maxBidders: 32,
      classHash: manifest.auctionHouseClassHash,
    })

    await expect(readAuctionSnapshot(reader(), manifest, 7n)).resolves.toMatchObject({
      config: {
        auctionId: 7n,
        seller: '0x777',
        sellerClaimHandle: 0xabcn,
        nftContract: '0x999',
        tokenId: 99n,
        reservePrice: 2n,
        cap: 5n,
        bidderLimit: 2,
      },
      state: {
        settled: true,
        sold: true,
        winnerIndex: 1,
        winnerRecipient: '0x888',
        clearingPrice: 3n,
        sellerEntitlement: 3n,
      },
      bids: [
        { commitment: 0x111n, amount: 3n, revealed: true },
        { commitment: 0x222n, amount: 4n, revealed: true },
      ],
      nftOwner: '0x888',
      custodyValid: true,
    })
  })

  it('rejects deployment drift, unbounded reads, and invalid terminal custody', async () => {
    const badClassReader = { ...reader(), getClassHashAt: async () => '0x999' }
    await expect(readAndValidateDeployment(badClassReader, manifest)).rejects.toThrow('class hash')
    await expect(
      readAndValidateDeployment(reader({ '0x123:get_house_config': ['0x999', manifest.paymentToken, '0x20'] }), manifest),
    ).rejects.toThrow('pool')
    await expect(readAuctionSnapshot(reader({ '0x123:get_bid_count': ['0x21'] }), manifest, 7n)).rejects.toThrow(
      'bounded maximum',
    )
    await expect(readAuctionSnapshot(reader({ '0x999:owner_of': ['0x777'] }), manifest, 7n)).rejects.toThrow(
      'NFT custody',
    )
  })
})
