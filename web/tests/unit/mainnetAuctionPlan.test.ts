import { describe, expect, it } from 'vitest'
import {
  buildMainnetAuctionCreationPlan,
  parseMainnetDeploymentRecord,
  renderMainnetEnvironment,
} from '@/config/mainnetAuctionPlan'
import { AUCTION_HOUSE_CLASS_HASH, DEMO_ERC721_CLASS_HASH } from '@/config/mainnetDeploymentPlan'
import { MAINNET_CHAIN_ID, MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'
import { MAINNET_DEPLOYER } from '@/config/mainnetRelease'

const deployment = JSON.stringify({
  schema: 'cipherbid.mainnet-deployment.v1',
  network: 'mainnet',
  chainId: MAINNET_CHAIN_ID,
  deployer: MAINNET_DEPLOYER,
  auctionHouse: '0x123',
  demoNft: '0x456',
  auctionHouseClassHash: AUCTION_HOUSE_CLASS_HASH,
  demoErc721ClassHash: DEMO_ERC721_CLASS_HASH,
  demoNftDeploymentTransactionHash: '0x789',
  strk20Pool: MAINNET_STRK20_POOL,
  paymentToken: STRK_TOKEN,
  remainingBudgetCeiling: '100000000000000000000',
})

describe('mainnet auction plan', () => {
  it('accepts only a deployment record bound to the frozen mainnet release', () => {
    expect(parseMainnetDeploymentRecord(deployment)).toEqual({
      auctionHouse: '0x123',
      demoNft: '0x456',
      demoNftDeploymentTransactionHash: '0x789',
      remainingBudgetCeiling: 100_000_000_000_000_000_000n,
    })
    expect(() => parseMainnetDeploymentRecord(deployment.replace(MAINNET_STRK20_POOL, '0x999'))).toThrow('pool')
    expect(() => parseMainnetDeploymentRecord(deployment.replace(MAINNET_DEPLOYER, '0x999'))).toThrow('deployer')
    expect(() => parseMainnetDeploymentRecord(deployment.replace(AUCTION_HOUSE_CLASS_HASH, '0x999'))).toThrow('class')
    expect(() => parseMainnetDeploymentRecord(deployment.replace('"demoNft":"0x456",', ''))).toThrow('DemoERC721')
    expect(() => parseMainnetDeploymentRecord(deployment.replace('"demoNft":"0x456"', '"demoNft":"0x0"'))).toThrow(
      'DemoERC721',
    )
    expect(() =>
      parseMainnetDeploymentRecord(
        deployment.replace(
          '"demoNftDeploymentTransactionHash":"0x789"',
          '"demoNftDeploymentTransactionHash":"invalid"',
        ),
      ),
    ).toThrow('DemoERC721 deployment transaction')
  })

  it('builds the exact 1 STRK reserve, 4 STRK cap, ten-minute/five-minute auction', () => {
    const plan = buildMainnetAuctionCreationPlan({
      auctionHouse: '0x123',
      nftContract: '0x456',
      auctionId: 7n,
      sellerClaimHandle: 0x789n,
      nowSeconds: 1_000,
    })

    expect(plan.form).toEqual({
      auctionId: '7',
      nftContract: '0x456',
      tokenId: '99',
      reservePrice: '1000000000000000000',
      cap: '4000000000000000000',
      biddingDeadline: '1600',
      revealDeadline: '1900',
      bidderLimit: '2',
      sellerClaimHandle: '0x789',
    })
  })

  it('renders the exact public frontend environment from a verified deployment', () => {
    const parsed = parseMainnetDeploymentRecord(deployment)

    expect(renderMainnetEnvironment(parsed)).toBe(
      [
        'NEXT_PUBLIC_CIPHERBID_NETWORK=mainnet',
        'NEXT_PUBLIC_STARKNET_RPC_URL=https://api.zan.top/public/starknet-mainnet/rpc/v0_10',
        'NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS=0x123',
        `NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH=${AUCTION_HOUSE_CLASS_HASH}`,
        `NEXT_PUBLIC_STRK20_POOL_ADDRESS=${MAINNET_STRK20_POOL}`,
        `NEXT_PUBLIC_STRK_TOKEN_ADDRESS=${STRK_TOKEN}`,
        '',
      ].join('\n'),
    )
  })
})
