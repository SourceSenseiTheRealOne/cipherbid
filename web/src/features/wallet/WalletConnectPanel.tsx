'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { createStore } from '@starknet-io/get-starknet-discovery'
import { browserWalletDependencies } from './browserWalletDependencies'
import { connectPrivacyWallet, type PrivacyWalletConnection } from './walletConnection'
import { useWalletStore } from './walletStore'
import { createSepoliaProvider, SEPOLIA_CHAIN_ID } from '@/lib/starknet/network'
import { MAINNET_CHAIN_ID } from '@/config/deployment'

type WalletDiscovery = Readonly<{
  getWallets: () => readonly unknown[]
  subscribe: (listener: (wallets: readonly unknown[]) => void) => () => void
}>

type WalletConnectPanelProps = Readonly<{
  createDiscovery?: () => WalletDiscovery
  provider?: unknown
  connect?: (wallet: unknown, provider: unknown) => Promise<PrivacyWalletConnection>
  subscribeWalletChanges?: (wallet: unknown, onChange: () => void) => () => void
  expectedChainId?: string
  expectedNetworkLabel?: string
  onConnected?: (connection: PrivacyWalletConnection) => void
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

function walletInitial(name: string): string {
  const initial = [...name].find((character) => /\S/.test(character))
  return (initial ?? 'W').toUpperCase()
}

function walletOptionTestId(wallet: unknown): string {
  return `wallet-option-${walletName(wallet)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')}`
}

function isPickable(wallet: unknown): boolean {
  return !walletName(wallet).toLowerCase().includes('metamask')
}

function normalizedChainId(chainId: string): string {
  if (chainId === 'SN_SEPOLIA') return SEPOLIA_CHAIN_ID
  if (chainId === 'SN_MAIN') return MAINNET_CHAIN_ID
  try {
    return `0x${BigInt(chainId).toString(16)}`
  } catch {
    return chainId
  }
}

const defaultConnect = (wallet: unknown, provider: unknown) =>
  connectPrivacyWallet(wallet, provider, browserWalletDependencies)
const defaultSepoliaProvider = createSepoliaProvider()

export function WalletConnectPanel({
  createDiscovery = createBrowserDiscovery,
  provider = defaultSepoliaProvider,
  connect = defaultConnect,
  subscribeWalletChanges = browserWalletDependencies.subscribeWalletChanges,
  expectedChainId = SEPOLIA_CHAIN_ID,
  expectedNetworkLabel = 'Starknet Sepolia',
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
      if (normalizedChainId(connection.chainId) !== normalizedChainId(expectedChainId)) {
        useWalletStore.getState().failConnection(attempt, `Switch the wallet to ${expectedNetworkLabel} and try again.`)
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
      onConnected?.(connection)
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
      <section
        aria-label="Wallet connection"
        data-testid="wallet-connect-module"
        className="rounded-xl border border-white/10 bg-[#0b0c12]/90 p-4 text-[#f7f8f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
      >
        <div data-testid="wallet-connected-state">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a8b1ff]">
                Wallet access
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-[-0.025em]">Wallet connected</h2>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#3bc478]/25 bg-[#3bc478]/10 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[#aee5c1]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3bc478]" aria-hidden="true" />
              {supportsStrk20 ? 'STRK20 compatible' : 'STRK20 unsupported'}
            </span>
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">Wallet</dt>
              <dd className="mt-1 text-sm font-medium text-[#eef0f5]">{connectedWalletName}</dd>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">Chain</dt>
              <dd className="mt-1 break-all font-mono text-xs text-[#dbe0e8]">{chainId}</dd>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 sm:col-span-2">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">Account</dt>
              <dd className="mt-1 break-all font-mono text-xs leading-5 text-[#dbe0e8]">
                <output>{address}</output>
              </dd>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 sm:col-span-2">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">
                Wallet API
              </dt>
              <dd className="mt-1 font-mono text-xs text-[#dbe0e8]">{walletApiVersions.join(', ')}</dd>
            </div>
          </dl>
        </div>
        <button
          type="button"
          onClick={disconnectWallet}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-[#dbe0e8] transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8b1ff]"
        >
          Disconnect wallet
        </button>
      </section>
    )
  }

  return (
    <section
      aria-label="Wallet connection"
      data-testid="wallet-connect-module"
      className="rounded-xl border border-white/10 bg-[#0b0c12]/90 p-4 text-[#f7f8f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#a8b1ff]/25 bg-[#7170ff]/10 font-mono text-sm font-semibold text-[#d7dcff]">
          C
        </span>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a8b1ff]">
            Wallet access
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-[-0.025em]">Connect a privacy-capable wallet</h2>
          <p className="mt-1 text-xs leading-5 text-[#9ba3af]">
            Choose a supported wallet to verify your network and STRK20 capability.
          </p>
        </div>
      </div>
      {wallets.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-xs leading-5 text-[#9ba3af]">
          No Starknet wallet detected. Install or unlock Ready, then refresh.
        </p>
      ) : null}
      {status === 'connecting' ? (
        <div role="status" className="mt-4 rounded-lg border border-[#a8b1ff]/20 bg-[#7170ff]/10 p-3">
          <p className="text-sm font-medium text-[#eef0f5]">Connecting to {pendingWalletName ?? 'wallet'}…</p>
          <button
            type="button"
            onClick={disconnectWallet}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-[#dbe0e8] transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8b1ff]"
          >
            Cancel connection
          </button>
        </div>
      ) : null}
      <div aria-label="Detected wallets" className="mt-4 space-y-2">
        {wallets.map((wallet, index) => (
          <button
            key={`${walletName(wallet)}-${index}`}
            type="button"
            aria-label={walletName(wallet)}
            data-testid={walletOptionTestId(wallet)}
            disabled={status === 'connecting'}
            onClick={() => void selectWallet(wallet)}
            className="group flex min-h-11 w-full items-center gap-3 rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-left transition-colors hover:border-[#a8b1ff]/45 hover:bg-[#7170ff]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8b1ff] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span
              data-testid={`wallet-avatar-${walletOptionTestId(wallet).replace('wallet-option-', '')}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#151728] font-mono text-xs font-bold text-[#d7dcff]"
              aria-hidden="true"
            >
              {walletInitial(walletName(wallet))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#eef0f5]">{walletName(wallet)}</span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-[#7f8795]">
                Wallet API check
              </span>
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-[#7f8795] transition-transform group-hover:translate-x-0.5 group-hover:text-[#d7dcff]"
            >
              <path
                d="m7 4 6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
              />
            </svg>
          </button>
        ))}
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-3 text-xs leading-5 text-amber-100"
        >
          {error}
        </p>
      ) : null}
    </section>
  )
}
