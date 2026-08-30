'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { RpcProvider } from 'starknet'
import { WalletConnectPanel } from '@/features/wallet/WalletConnectPanel'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'
import type { DeploymentManifest } from '@/config/deployment'
import {
  MAINNET_DEMO_BIDDER_CONFIG,
  demoBidderConfig,
  demoBidderForAddress,
  publicDemoShieldError,
  runDemoBidderActivation,
  runDemoBidderShield,
  type DemoBidderConfig,
} from '@/features/demo/demoBidderShield'

type ShieldResult = Awaited<ReturnType<typeof runDemoBidderShield>>

export function DemoBidderSetupPanel({
  connection,
  config = MAINNET_DEMO_BIDDER_CONFIG,
  activate = runDemoBidderActivation,
  shield = runDemoBidderShield,
}: Readonly<{
  connection: PrivacyWalletConnection | null
  config?: DemoBidderConfig
  activate?: (connection: PrivacyWalletConnection, config: DemoBidderConfig) => Promise<ShieldResult>
  shield?: (connection: PrivacyWalletConnection, config: DemoBidderConfig) => Promise<ShieldResult>
}>) {
  const bidder = connection ? demoBidderForAddress(connection.address, config) : null
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ShieldResult | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const wrongAccount = connection !== null && bidder === null

  async function submitActivation() {
    if (!connection || !bidder || pending) return
    setPending(true)
    setResult(null)
    setError(null)
    setStatus('Confirm the standard Ready X activation transaction.')
    try {
      const submitted = await activate(connection, config)
      setResult(submitted)
      setStatus('Activation transaction submitted. Wait for acceptance, reconnect, then shield.')
    } catch {
      setStatus('')
      setError('Ready X could not submit account activation. No transaction was assumed successful.')
    } finally {
      setPending(false)
    }
  }

  async function submitShield() {
    if (!connection || !bidder || pending) return
    setPending(true)
    setResult(null)
    setError(null)
    setStatus('Confirm the Ready X approval and private deposit prompts.')
    try {
      const submitted = await shield(connection, config)
      setResult(submitted)
      setStatus('Shield transaction submitted. Wait for acceptance and ten blocks before bidding.')
    } catch (cause) {
      setStatus('')
      setError(publicDemoShieldError(cause))
    } finally {
      setPending(false)
    }
  }

  const buttonLabel = bidder ? `Shield ${config.shieldDisplay} STRK for ${bidder}` : 'Connect Bidder A or Bidder B'

  return (
    <section aria-labelledby="demo-shield-title" className="cb-panel p-5 sm:p-6">
      <p className="cb-kicker">Private funding setup</p>
      <h2 id="demo-shield-title" className="cb-display mt-2 text-3xl">
        Prepare a demo bidder
      </h2>
      <p className="cb-copy mt-3 text-sm">
        Ready X owns registration, note discovery, proving, and submission. CipherBid requests one public{' '}
        {config.shieldDisplay} STRK deposit and never receives a viewing key.
      </p>

      {bidder ? (
        <div className="mt-5 border border-[var(--cb-accent)]/20 bg-[var(--cb-accent-soft)] p-4">
          <p className="font-semibold text-[var(--cb-accent-strong)]">{bidder} connected</p>
          <p className="mt-1 break-all font-mono text-xs text-[var(--cb-text-soft)]">{connection?.address}</p>
        </div>
      ) : null}
      {wrongAccount ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100"
        >
          Connect bidder A or bidder B; the seller account cannot shield bidder funds.
        </p>
      ) : null}

      <div className={`mt-5 grid gap-3 ${config.allowActivation ? 'sm:grid-cols-2' : ''}`}>
        {config.allowActivation ? (
          <button
            type="button"
            disabled={!bidder || pending}
            onClick={() => void submitActivation()}
            className="cb-secondary disabled:cursor-not-allowed disabled:opacity-45"
          >
            {bidder ? `Activate ${bidder}` : 'Activate bidder'}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!bidder || pending}
          onClick={() => void submitShield()}
          className="cb-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? 'Waiting for Ready X…' : buttonLabel}
        </button>
      </div>
      <p role="status" className="mt-4 min-h-6 text-sm text-[var(--cb-accent-strong)]">
        {status}
      </p>
      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100"
        >
          {error}
        </p>
      ) : null}
      {result ? (
        <a
          href={`${config.explorerTransactionBase}/${result.transactionHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center break-all font-mono text-xs text-[var(--cb-accent-strong)] underline decoration-[var(--cb-accent)]/50 underline-offset-4"
        >
          {result.transactionHash}
        </a>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-[var(--cb-faint)]">
        The pool currently charges its own private-operation fee. Keep the remaining public STRK for account fees and
        later claims.
      </p>
    </section>
  )
}

export function DemoBidderSetupPage({ deployment }: Readonly<{ deployment: DeploymentManifest }>) {
  const [connection, setConnection] = useState<PrivacyWalletConnection | null>(null)
  const provider = useMemo(() => new RpcProvider({ nodeUrl: deployment.rpcUrl }), [deployment.rpcUrl])
  const config = demoBidderConfig(deployment.network)

  return (
    <main className="cipherbid-auction-page px-5 sm:px-8 lg:px-10">
      <div className="cb-shell max-w-5xl">
        <header className="cb-nav">
          <Link href="/" className="cb-wordmark">
            CipherBid
          </Link>
          <Link href="/" className="cb-nav-link">
            Back to auctions
          </Link>
        </header>
        <section className="cb-route-intro" aria-labelledby="demo-setup-title">
          <p className="cb-kicker">{config.networkLabel} demo preparation</p>
          <h1 id="demo-setup-title" className="cb-display">
            Shield both demo bidders before the timer starts
          </h1>
          <p className="cb-copy mt-5 max-w-2xl text-base">
            Connect Bidder A, shield once, disconnect, switch Ready X to Bidder B, and repeat. The auction CLI will
            refuse to start until both deposits are at least ten blocks old.
          </p>
        </section>
        <div className="cb-workbench">
          <WalletConnectPanel
            provider={provider}
            expectedChainId={deployment.chainId}
            expectedNetworkLabel={config.networkLabel}
            onConnected={setConnection}
            onDisconnected={() => setConnection(null)}
          />
          <DemoBidderSetupPanel connection={connection} config={config} />
        </div>
      </div>
    </main>
  )
}
