'use client'

import { useState, useSyncExternalStore } from 'react'
import { createStore } from '@starknet-io/get-starknet-discovery'
import { browserWalletDependencies } from './browserWalletDependencies'
import { connectPrivacyWallet, type PrivacyWalletConnection } from './walletConnection'
import { useWalletStore } from './walletStore'
import { createSepoliaProvider, isSepoliaChainId } from '@/lib/starknet/network'

type WalletDiscovery = Readonly<{
  getWallets: () => readonly unknown[]
  subscribe: (listener: (wallets: readonly unknown[]) => void) => () => void
}>

type WalletConnectPanelProps = Readonly<{
  createDiscovery?: () => WalletDiscovery
  provider?: unknown
  connect?: (wallet: unknown, provider: unknown) => Promise<PrivacyWalletConnection>
  onConnected: () => void
}>

const EMPTY_WALLETS: readonly unknown[] = []

function createBrowserDiscovery(): WalletDiscovery {
  const store = createStore({ eip1193Adapters: [] })
  return {
    getWallets: () => store.getWallets(),
    subscribe: (listener) => store.subscribe((wallets) => listener(wallets)),
  }
}

function walletName(wallet: unknown): string {
  if (typeof wallet !== 'object' || wallet === null || !('name' in wallet) || typeof wallet.name !== 'string') {
    return 'Starknet wallet'
  }
  return wallet.name
}

function isPickable(wallet: unknown): boolean {
  return !walletName(wallet).toLowerCase().includes('metamask')
}

const defaultConnect = (wallet: unknown, provider: unknown) =>
  connectPrivacyWallet(wallet, provider, browserWalletDependencies)
const defaultSepoliaProvider = createSepoliaProvider()

export function WalletConnectPanel({
  createDiscovery = createBrowserDiscovery,
  provider = defaultSepoliaProvider,
  connect = defaultConnect,
  onConnected,
}: WalletConnectPanelProps) {
  const [discovery] = useState(createDiscovery)
  const [walletSnapshot] = useState(() => {
    let current = discovery.getWallets()
    return {
      getSnapshot: () => current,
      subscribe: (onStoreChange: () => void) =>
        discovery.subscribe((nextWallets) => {
          current = nextWallets
          onStoreChange()
        }),
    }
  })
  const discoveredWallets = useSyncExternalStore(
    walletSnapshot.subscribe,
    walletSnapshot.getSnapshot,
    () => EMPTY_WALLETS,
  )
  const wallets = discoveredWallets.filter(isPickable)
  const status = useWalletStore((state) => state.status)
  const address = useWalletStore((state) => state.address)
  const error = useWalletStore((state) => state.error)

  async function selectWallet(wallet: unknown) {
    useWalletStore.getState().beginConnection()
    try {
      const connection = await connect(wallet, provider)
      if (!isSepoliaChainId(connection.chainId)) {
        useWalletStore.getState().failConnection('Switch the wallet to Starknet Sepolia and try again.')
        return
      }
      if (!connection.supportsStrk20) {
        useWalletStore.getState().failConnection('Wallet API 0.10.3 or newer is required for STRK20.')
        return
      }
      useWalletStore.getState().completeConnection(connection)
      onConnected()
    } catch {
      useWalletStore.getState().failConnection('Wallet connection failed or was rejected.')
    }
  }

  if (status === 'connected' && address) {
    return (
      <section aria-label="Wallet connection">
        <p>Connected on Starknet Sepolia</p>
        <output>{address}</output>
      </section>
    )
  }

  return (
    <section aria-label="Wallet connection">
      <h2>Connect a privacy-capable wallet</h2>
      {wallets.length === 0 ? <p>No Starknet wallet detected. Install or unlock Ready, then refresh.</p> : null}
      <div aria-label="Detected wallets">
        {wallets.map((wallet, index) => (
          <button
            key={`${walletName(wallet)}-${index}`}
            type="button"
            disabled={status === 'connecting'}
            onClick={() => void selectWallet(wallet)}
          >
            {walletName(wallet)}
          </button>
        ))}
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  )
}
