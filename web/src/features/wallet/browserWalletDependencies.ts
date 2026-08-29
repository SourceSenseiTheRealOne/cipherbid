import type { WalletWithStarknetFeatures } from '@starknet-io/get-starknet-wallet-standard/features'
import { type ProviderInterface, validateAndParseAddress, walletV6, WalletAccountV6 } from 'starknet'
import type { WalletConnectionDependencies } from './walletConnection'

function asWallet(wallet: unknown): WalletWithStarknetFeatures {
  return wallet as WalletWithStarknetFeatures
}

export const browserWalletDependencies: WalletConnectionDependencies = {
  createAccount: (provider, wallet) =>
    WalletAccountV6.connect(provider as ProviderInterface, asWallet(wallet)) as Promise<unknown>,
  requestAccounts: async (wallet) => {
    const result = await walletV6.requestAccounts(asWallet(wallet))
    if (Array.isArray(result)) return result.map(String)
    if (typeof result === 'string') return result
    throw new Error('Wallet account request returned an unsupported response')
  },
  getPermissions: async (wallet) => {
    const result = await walletV6.getPermissions(asWallet(wallet))
    if (!Array.isArray(result)) throw new Error('Wallet permission request returned an unsupported response')
    return result.map(String)
  },
  requestChainId: async (wallet) => String(await walletV6.requestChainId(asWallet(wallet))),
  supportedWalletApi: async (wallet) => {
    const result = await walletV6.supportedWalletApi(asWallet(wallet))
    if (!Array.isArray(result)) throw new Error('Wallet API capability request returned an unsupported response')
    return result.map(String)
  },
  normalizeAddress: (address) => validateAndParseAddress(address),
  subscribeWalletChanges: (wallet, onChange) => {
    const events = asWallet(wallet).features?.['standard:events']
    if (!events) return () => undefined
    return events.on('change', (changes) => {
      if (changes.accounts || changes.chains || changes.features) onChange()
    })
  },
}
