import { MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'
import { MAINNET_DEPLOYER } from '@/config/mainnetRelease'

export const AUCTION_HOUSE_CLASS_HASH = '0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4' as const
export const DEMO_ERC721_CLASS_HASH = '0x06c7cba5680595203f9327f5784130907bad1b808891122ad358c10b93136a41' as const
export const MAINNET_ACCOUNT_NAME = 'cipherbid-mainnet-deployer' as const
export const MAINNET_ACCOUNT_FILE = '/home/sourcesensei/.starknet_accounts/cipherbid-hackathon-mainnet.json' as const
export const MAINNET_AUCTION_HOUSE_SALT = '0x4349504845524249445f41485f4d41494e4e45545f5631' as const
export const MAINNET_DEMO_NFT_SALT = '0x4349504845524249445f4e46545f4d41494e4e45545f5631' as const
export const MAINNET_MAXIMUM_BUDGET = 150n * 10n ** 18n
export const MAINNET_MINIMUM_FUNDING = 151n * 10n ** 18n

export type GasBounds = Readonly<{
  l1Gas: bigint
  l1GasPrice: bigint
  l2Gas: bigint
  l2GasPrice: bigint
  l1DataGas: bigint
  l1DataGasPrice: bigint
  ceiling: bigint
}>

export function buildMainnetDeploymentPlan() {
  return {
    network: 'mainnet' as const,
    accountName: MAINNET_ACCOUNT_NAME,
    accountFile: MAINNET_ACCOUNT_FILE,
    deployer: MAINNET_DEPLOYER,
    minimumFunding: MAINNET_MINIMUM_FUNDING,
    maximumBudget: MAINNET_MAXIMUM_BUDGET,
    declarations: [
      { contractName: 'AuctionHouse' as const, classHash: AUCTION_HOUSE_CLASS_HASH },
      { contractName: 'DemoERC721' as const, classHash: DEMO_ERC721_CLASS_HASH },
    ],
    auctionHouse: {
      classHash: AUCTION_HOUSE_CLASS_HASH,
      salt: MAINNET_AUCTION_HOUSE_SALT,
      constructorCalldata: [MAINNET_STRK20_POOL, STRK_TOKEN, '32'] as const,
    },
    demoNft: {
      classHash: DEMO_ERC721_CLASS_HASH,
      salt: MAINNET_DEMO_NFT_SALT,
    },
  }
}

function sameFelt(left: string, right: string): boolean {
  try {
    return BigInt(left) === BigInt(right)
  } catch {
    return false
  }
}

export function parseFrozenMainnetAccount(output: string): Readonly<{
  name: typeof MAINNET_ACCOUNT_NAME
  address: typeof MAINNET_DEPLOYER
  network: 'alpha-mainnet'
  type: 'Ready'
  deployed: boolean
}> {
  const escapedName = MAINNET_ACCOUNT_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\n)- ${escapedName}:\\n([\\s\\S]*?)(?=\\n- |$)`).exec(output)
  if (!match) throw new Error(`Named mainnet account ${MAINNET_ACCOUNT_NAME} was not found`)
  const block = match[1] ?? ''
  const field = (name: string) => new RegExp(`^\\s*${name}:\\s*(.+)$`, 'm').exec(block)?.[1]?.trim()
  const network = field('network')
  const address = field('address')
  const type = field('type')
  const deployed = field('deployed')

  if (network !== 'alpha-mainnet') throw new Error('Named account must use alpha-mainnet')
  if (!address || !sameFelt(address, MAINNET_DEPLOYER))
    throw new Error('Named account address does not match frozen deployer')
  if (type !== 'Ready') throw new Error('Named account must use the Ready account type')
  if (deployed !== 'true' && deployed !== 'false')
    throw new Error('Named Ready mainnet account has invalid deployment state')

  return Object.freeze({
    name: MAINNET_ACCOUNT_NAME,
    address: MAINNET_DEPLOYER,
    network: 'alpha-mainnet',
    type: 'Ready',
    deployed: deployed === 'true',
  })
}

export function requireFrozenMainnetAccount(output: string): Readonly<{
  name: typeof MAINNET_ACCOUNT_NAME
  address: typeof MAINNET_DEPLOYER
  network: 'alpha-mainnet'
  type: 'Ready'
}> {
  const account = parseFrozenMainnetAccount(output)
  if (!account.deployed) throw new Error('Named Ready mainnet account must already be deployed')
  return Object.freeze({
    name: account.name,
    address: account.address,
    network: account.network,
    type: account.type,
  })
}

function parsedValue(output: string, label: string): bigint {
  const match = new RegExp(`${label}:\\s*(\\d+)`).exec(output)
  if (!match) throw new Error(`Could not parse ${label} from sncast dry run`)
  return BigInt(match[1])
}

export function parseBufferedGasBounds(output: string, transactionBudget: bigint): GasBounds {
  if (transactionBudget <= 0n) throw new Error('Transaction budget must be positive')
  const buffer = (value: bigint, numerator: bigint, denominator: bigint) =>
    value === 0n ? 0n : (value * numerator + denominator - 1n) / denominator
  const l1Gas = buffer(parsedValue(output, 'L1 Gas Consumed'), 13n, 10n)
  const l1GasPrice = buffer(parsedValue(output, 'L1 Gas Price'), 3n, 2n)
  const l2Gas = buffer(parsedValue(output, 'L2 Gas Consumed'), 13n, 10n)
  const l2GasPrice = buffer(parsedValue(output, 'L2 Gas Price'), 3n, 2n)
  const l1DataGas = buffer(parsedValue(output, 'L1 Data Gas Consumed'), 13n, 10n)
  const l1DataGasPrice = buffer(parsedValue(output, 'L1 Data Gas Price'), 3n, 2n)
  const ceiling = l1Gas * l1GasPrice + l2Gas * l2GasPrice + l1DataGas * l1DataGasPrice
  if (ceiling > transactionBudget) {
    throw new Error(
      `Buffered transaction ceiling ${ceiling} Fri exceeds remaining mainnet budget ${transactionBudget} Fri`,
    )
  }
  return Object.freeze({ l1Gas, l1GasPrice, l2Gas, l2GasPrice, l1DataGas, l1DataGasPrice, ceiling })
}
