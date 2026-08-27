import { supportsWalletApiVersion } from './walletCapabilities'

export type WalletConnectionDependencies = {
  createAccount: (provider: unknown, wallet: unknown) => Promise<unknown>
  requestAccounts: (wallet: unknown) => Promise<readonly string[] | string>
  getPermissions: (wallet: unknown) => Promise<readonly string[]>
  requestChainId: (wallet: unknown) => Promise<string>
  supportedWalletApi: (wallet: unknown) => Promise<readonly string[]>
  normalizeAddress: (address: string) => string
  subscribeWalletChanges: (wallet: unknown, onChange: () => void) => () => void
}

export type PrivacyWalletConnection = Readonly<{
  account: unknown
  address: `0x${string}`
  chainId: string
  walletApiVersions: readonly string[]
  supportsStrk20: boolean
}>

/**
 * Connection sequencing adapted from the MIT STRK20 starter kit, with the
 * privacy-specific supportedWalletApi capability query and no balance probe.
 */
export async function connectPrivacyWallet(
  wallet: unknown,
  provider: unknown,
  dependencies: WalletConnectionDependencies,
): Promise<PrivacyWalletConnection> {
  const account = await dependencies.createAccount(provider, wallet)
  const accounts = await dependencies.requestAccounts(wallet)

  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('Wallet did not return an account')
  }

  const permissions = await dependencies.getPermissions(wallet)
  if (!permissions.includes('accounts')) {
    throw new Error('Wallet account permission was not granted')
  }

  const [chainId, walletApiVersions] = await Promise.all([
    dependencies.requestChainId(wallet),
    dependencies.supportedWalletApi(wallet),
  ])
  const address = dependencies.normalizeAddress(accounts[0])

  if (!address.startsWith('0x')) {
    throw new Error('Wallet returned an invalid Starknet address')
  }

  return {
    account,
    address: address as `0x${string}`,
    chainId,
    walletApiVersions: [...walletApiVersions],
    supportsStrk20: supportsWalletApiVersion(walletApiVersions),
  }
}
