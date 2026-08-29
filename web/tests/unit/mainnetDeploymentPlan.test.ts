import { describe, expect, it } from 'vitest'
import {
  AUCTION_HOUSE_CLASS_HASH,
  DEMO_ERC721_CLASS_HASH,
  MAINNET_ACCOUNT_FILE,
  MAINNET_MINIMUM_FUNDING,
  buildMainnetDeploymentPlan,
  parseFrozenMainnetAccount,
  parseBufferedGasBounds,
  requireFrozenMainnetAccount,
} from '@/config/mainnetDeploymentPlan'
import { MAINNET_DEPLOYER } from '@/config/mainnetRelease'
import { MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'

const accountList = `Available accounts:
- cipherbid-mainnet-deployer:
  network: alpha-mainnet
  public key: 0x123
  address: ${MAINNET_DEPLOYER}
  class hash: 0x36078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f
  deployed: true
  legacy: false
  type: Ready
`

describe('mainnet deployment plan', () => {
  it('freezes exact classes, salts, constructor calldata, and budget', () => {
    expect(MAINNET_ACCOUNT_FILE).toBe('/home/sourcesensei/.starknet_accounts/cipherbid-hackathon-mainnet.json')
    expect(MAINNET_MINIMUM_FUNDING).toBe(151n * 10n ** 18n)
    expect(buildMainnetDeploymentPlan()).toEqual({
      network: 'mainnet',
      accountName: 'cipherbid-mainnet-deployer',
      accountFile: MAINNET_ACCOUNT_FILE,
      deployer: MAINNET_DEPLOYER,
      minimumFunding: MAINNET_MINIMUM_FUNDING,
      maximumBudget: 150n * 10n ** 18n,
      declarations: [
        { contractName: 'AuctionHouse', classHash: AUCTION_HOUSE_CLASS_HASH },
        { contractName: 'DemoERC721', classHash: DEMO_ERC721_CLASS_HASH },
      ],
      auctionHouse: {
        classHash: AUCTION_HOUSE_CLASS_HASH,
        salt: '0x4349504845524249445f41485f4d41494e4e45545f5631',
        constructorCalldata: [MAINNET_STRK20_POOL, STRK_TOKEN, '32'],
      },
      demoNft: {
        classHash: DEMO_ERC721_CLASS_HASH,
        salt: '0x4349504845524249445f4e46545f4d41494e4e45545f5631',
      },
    })
  })

  it('accepts only the named deployed Ready mainnet account at the frozen address', () => {
    expect(requireFrozenMainnetAccount(accountList)).toEqual({
      name: 'cipherbid-mainnet-deployer',
      address: MAINNET_DEPLOYER,
      network: 'alpha-mainnet',
      type: 'Ready',
    })
    expect(() => requireFrozenMainnetAccount(accountList.replace('alpha-mainnet', 'alpha-sepolia'))).toThrow('mainnet')
    expect(() => requireFrozenMainnetAccount(accountList.replace(MAINNET_DEPLOYER, '0x123'))).toThrow('address')
    expect(() => requireFrozenMainnetAccount(accountList.replace('type: Ready', 'type: OpenZeppelin'))).toThrow('Ready')
  })

  it('reads the frozen counterfactual account but requires deployment for contract writes', () => {
    const counterfactual = accountList.replace('deployed: true', 'deployed: false')

    expect(parseFrozenMainnetAccount(counterfactual)).toEqual({
      name: 'cipherbid-mainnet-deployer',
      address: MAINNET_DEPLOYER,
      network: 'alpha-mainnet',
      type: 'Ready',
      deployed: false,
    })
    expect(() => requireFrozenMainnetAccount(counterfactual)).toThrow('deployed')
  })

  it('buffers detailed sncast resources and rejects a transaction above its budget', () => {
    const details = `L1 Gas Consumed:      10
L1 Gas Price:         100
L2 Gas Consumed:      1000
L2 Gas Price:         100
L1 Data Gas Consumed: 20
L1 Data Gas Price:    100`
    expect(parseBufferedGasBounds(details, 1_000_000n)).toEqual({
      l1Gas: 13n,
      l1GasPrice: 150n,
      l2Gas: 1300n,
      l2GasPrice: 150n,
      l1DataGas: 26n,
      l1DataGasPrice: 150n,
      ceiling: 200_850n,
    })
    expect(() => parseBufferedGasBounds(details, 200_000n)).toThrow('budget')
  })
})
