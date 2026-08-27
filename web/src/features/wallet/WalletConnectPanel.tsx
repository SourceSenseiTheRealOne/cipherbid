'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
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
  subscribeWalletChanges?: (wallet: unknown, onChange: () => void) => () => void
  onConnected: () => void
  onDisconnected?: () => void
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
  subscribeWalletChanges = browserWalletDependencies.subscribeWalletChanges,
  onConnected,
  onDisconnected,
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
  const connectedWalletName = useWalletStore((state) => state.walletName)
  const address = useWalletStore((state) => state.address)
  const chainId = useWalletStore((state) => state.chainId)
  const walletApiVersions = useWalletStore((state) => state.walletApiVersions)
  const supportsStrk20 = useWalletStore((state) => state.supportsStrk20)
  const error = useWalletStore((state) => state.error)
  const [connectedWallet, setConnectedWallet] = useState<unknown | null>(null)
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'connected' || connectedWallet === null) return

    return subscribeWalletChanges(connectedWallet, () => {
      setConnectedWallet(null)
      useWalletStore.getState().invalidateConnection('Wallet account or capabilities changed. Reconnect to continue.')
      onDisconnected?.()
    })
  }, [connectedWallet, onDisconnected, status, subscribeWalletChanges])

  async function selectWallet(wallet: unknown) {
    const attempt = useWalletStore.getState().beginConnection()
    setPendingWalletName(walletName(wallet))
    try {
      const connection = await connect(wallet, provider)
      if (!isSepoliaChainId(connection.chainId)) {
        useWalletStore.getState().failConnection(attempt, 'Switch the wallet to Starknet Sepolia and try again.')
        return
      }
      if (!connection.supportsStrk20) {
        useWalletStore.getState().failConnection(attempt, 'Wallet API 0.10.3 or newer is required for STRK20.')
        return
      }
      const completed = useWalletStore.getState().completeConnection(attempt, {
        ...connection,
        walletName: walletName(wallet),
      })
      if (!completed) return
      setConnectedWallet(wallet)
      onConnected()
    } catch {
      useWalletStore.getState().failConnection(attempt, 'Wallet connection failed or was rejected.')
    } finally {
      setPendingWalletName(null)
    }
  }

  function disconnectWallet() {
    setConnectedWallet(null)
    useWalletStore.getState().disconnect()
    onDisconnected?.()
  }

  if (status === 'connected' && address) {
    return (
      <section aria-label="Wallet connection">
        <h2>Wallet connected</h2>
        <dl>
          <div>
            <dt>Wallet</dt>
            <dd>{connectedWalletName}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>
              <output>{address}</output>
            </dd>
          </div>
          <div>
            <dt>Chain</dt>
            <dd>Chain: {chainId}</dd>
          </div>
          <div>
            <dt>Wallet API</dt>
            <dd>Wallet API: {walletApiVersions.join(', ')}</dd>
          </div>
          <div>
            <dt>Compatibility</dt>
            <dd>{supportsStrk20 ? 'STRK20 compatible' : 'STRK20 unsupported'}</dd>
          </div>
        </dl>
        <button type="button" onClick={disconnectWallet}>
          Disconnect wallet
        </button>
      </section>
    )
  }

  return (
    <section aria-label="Wallet connection">
      <h2>Connect a privacy-capable wallet</h2>
      {wallets.length === 0 ? <p>No Starknet wallet detected. Install or unlock Ready, then refresh.</p> : null}
      {status === 'connecting' ? (
        <div role="status">
          <p>Connecting to {pendingWalletName ?? 'wallet'}…</p>
          <button type="button" onClick={disconnectWallet}>
            Cancel connection
          </button>
        </div>
      ) : null}
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
