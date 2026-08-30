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
        className="cb-panel p-4 text-[var(--cb-text)]"
      >
        <div data-testid="wallet-connected-state">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="cb-kicker">Wallet access</p>
              <h2 className="mt-1 text-base font-semibold tracking-[-0.025em]">Wallet connected</h2>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--cb-accent)]/25 bg-[var(--cb-accent-soft)] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--cb-accent-strong)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3bc478]" aria-hidden="true" />
              {supportsStrk20 ? 'STRK20 compatible' : 'STRK20 unsupported'}
            </span>
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">Wallet</dt>
              <dd className="mt-1 text-sm font-medium text-[var(--cb-text)]">{connectedWalletName}</dd>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">Chain</dt>
              <dd className="mt-1 break-all font-mono text-xs text-[var(--cb-text-soft)]">{chainId}</dd>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 sm:col-span-2">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">Account</dt>
              <dd className="mt-1 break-all font-mono text-xs leading-5 text-[var(--cb-text-soft)]">
                <output>{address}</output>
              </dd>
            </div>
            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 sm:col-span-2">
              <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7f8795]">
                Wallet API
              </dt>
              <dd className="mt-1 font-mono text-xs text-[var(--cb-text-soft)]">{walletApiVersions.join(', ')}</dd>
            </div>
          </dl>
        </div>
        <button type="button" onClick={disconnectWallet} className="cb-secondary mt-4 w-full">
          Disconnect wallet
        </button>
      </section>
    )
  }

  return (
    <section
      aria-label="Wallet connection"
      data-testid="wallet-connect-module"
      className="cb-panel p-4 text-[var(--cb-text)]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--cb-accent)]/25 bg-[var(--cb-accent-soft)] font-mono text-sm font-semibold text-[var(--cb-accent-strong)]">
          C
        </span>
        <div>
          <p className="cb-kicker">Wallet access</p>
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
        <div role="status" className="mt-4 border border-[var(--cb-accent)]/20 bg-[var(--cb-accent-soft)] p-3">
          <p className="text-sm font-medium text-[#eef0f5]">Connecting to {pendingWalletName ?? 'wallet'}…</p>
          <button type="button" onClick={disconnectWallet} className="cb-secondary mt-3 w-full">
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
            className="cb-control group flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span
              data-testid={`wallet-avatar-${walletOptionTestId(wallet).replace('wallet-option-', '')}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--cb-border)] bg-[var(--cb-surface-raised)] font-mono text-xs font-bold text-[var(--cb-accent-strong)]"
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
              className="h-4 w-4 shrink-0 text-[var(--cb-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--cb-accent-strong)]"
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
