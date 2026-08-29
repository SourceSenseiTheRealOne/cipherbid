import { describe, expect, it } from 'vitest'
import type { DeploymentManifest } from '@/config/deployment'
import { toAuctionLiveViewModel } from '@/features/auction/auctionLiveViewModel'
import type { readAuctionSnapshot } from '@/features/auction/auctionReader'

const manifest: DeploymentManifest = {
  network: 'mainnet',
  chainId: '0x534e5f4d41494e',
  rpcUrl: 'https://rpc.example/mainnet',
  auctionHouse: '0x123',
  auctionHouseClassHash: '0x456',
  strk20Pool: '0x789',
  paymentToken: '0xabc',
}

const snapshot = {
  config: {
    auctionId: 7n,
    seller: '0x111',
    sellerClaimHandle: 18n,
    nftContract: '0x222',
    tokenId: 99n,
    reservePrice: 1_000_000_000_000_000_000n,
    cap: 4_000_000_000_000_000_000n,
    biddingDeadline: 100n,
    revealDeadline: 200n,
    bidderLimit: 2,
  },
  state: {
    settled: true,
    sold: true,
    winnerIndex: 1,
    winnerCommitment: 51n,
    winnerRecipient: '0x333',
    clearingPrice: 2_000_000_000_000_000_000n,
    sellerEntitlement: 2_000_000_000_000_000_000n,
    sellerAuthorizedNote: 68n,
    sellerClaimConsumed: false,
  },
  bids: [
    { commitment: 85n, claimHandle: 102n, revealed: true, amount: 2n, assetRecipient: '0x444' },
    { commitment: 119n, claimHandle: 136n, revealed: true, amount: 3n, assetRecipient: '0x333' },
  ],
  nftOwner: '0x333',
  custodyValid: true,
} satisfies Awaited<ReturnType<typeof readAuctionSnapshot>>

describe('auction live view model', () => {
  it('maps every verified manifest and snapshot field without inventing values', () => {
    expect(toAuctionLiveViewModel(manifest, snapshot)).toEqual({
      network: 'mainnet',
      chainId: '0x534e5f4d41494e',
      rpcUrl: 'https://rpc.example/mainnet',
      auctionHouse: '0x123',
      auctionHouseClassHash: '0x456',
      strk20Pool: '0x789',
      paymentToken: '0xabc',
      auctionId: '7',
      seller: '0x111',
      sellerClaimHandle: '0x12',
      nftContract: '0x222',
      tokenId: '99',
      reservePrice: '1000000000000000000',
      cap: '4000000000000000000',
      biddingDeadline: '100',
      revealDeadline: '200',
      bidderLimit: 2,
      nftOwner: '0x333',
      custodyValid: true,
      state: {
        settled: true,
        sold: true,
        winnerIndex: 1,
        winnerCommitment: '0x33',
        winnerRecipient: '0x333',
        clearingPrice: '2000000000000000000',
        sellerEntitlement: '2000000000000000000',
        sellerAuthorizedNote: '0x44',
        sellerClaimConsumed: false,
      },
      bids: [
        {
          commitment: '0x55',
          claimHandle: '0x66',
          revealed: true,
          amount: '2',
          assetRecipient: '0x444',
        },
        {
          commitment: '0x77',
          claimHandle: '0x88',
          revealed: true,
          amount: '3',
          assetRecipient: '0x333',
        },
      ],
    })
  })
})
