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
    <section aria-labelledby="demo-shield-title" className="rounded-2xl border border-white/10 bg-[#111217] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8b1ff]">Private funding setup</p>
      <h2 id="demo-shield-title" className="mt-2 text-2xl font-semibold">Prepare a demo bidder</h2>
      <p className="mt-3 text-sm leading-6 text-[#9ba3af]">
        Ready X owns registration, note discovery, proving, and submission. CipherBid requests one public {config.shieldDisplay} STRK deposit and never receives a viewing key.
      </p>

      {bidder ? (
        <div className="mt-5 rounded-xl border border-[#3bc478]/20 bg-[#3bc478]/10 p-4">
          <p className="font-semibold text-[#aee5c1]">{bidder} connected</p>
          <p className="mt-1 break-all font-mono text-xs text-[#dbe0e8]">{connection?.address}</p>
        </div>
      ) : null}
      {wrongAccount ? (
        <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          Connect bidder A or bidder B; the seller account cannot shield bidder funds.
        </p>
      ) : null}

      <div className={`mt-5 grid gap-3 ${config.allowActivation ? 'sm:grid-cols-2' : ''}`}>
        {config.allowActivation ? (
          <button
            type="button"
            disabled={!bidder || pending}
            onClick={() => void submitActivation()}
            className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {bidder ? `Activate ${bidder}` : 'Activate bidder'}
          </button>
        ) : null}
        <button
          type="button"
          disabled={!bidder || pending}
          onClick={() => void submitShield()}
          className="min-h-12 rounded-xl bg-[#6654d9] px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? 'Waiting for Ready X…' : buttonLabel}
        </button>
      </div>
      <p role="status" className="mt-4 min-h-6 text-sm text-[#a8b1ff]">{status}</p>
      {error ? (
        <p role="alert" className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          {error}
        </p>
      ) : null}
      {result ? (
        <a
          href={`${config.explorerTransactionBase}/${result.transactionHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center break-all font-mono text-xs text-[#d7dcff] underline decoration-[#a8b1ff]/50 underline-offset-4"
        >
          {result.transactionHash}
        </a>
      ) : null}
      <p className="mt-4 text-xs leading-5 text-[#858b98]">
        The pool currently charges its own private-operation fee. Keep the remaining public STRK for account fees and later claims.
      </p>
    </section>
  )
}

export function DemoBidderSetupPage({ deployment }: Readonly<{ deployment: DeploymentManifest }>) {
  const [connection, setConnection] = useState<PrivacyWalletConnection | null>(null)
  const provider = useMemo(() => new RpcProvider({ nodeUrl: deployment.rpcUrl }), [deployment.rpcUrl])
  const config = demoBidderConfig(deployment.network)

  return (
    <main className="min-h-screen bg-[#08090a] px-5 py-10 text-[#f7f8f8] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <Link href="/" className="text-lg font-semibold tracking-[-0.04em]">CipherBid</Link>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm text-[#9ba3af] hover:text-white">Back to auctions</Link>
        </header>
        <section className="py-10 sm:py-14" aria-labelledby="demo-setup-title">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a8b1ff]">{config.networkLabel} demo preparation</p>
          <h1 id="demo-setup-title" className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Shield both demo bidders before the timer starts</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#9ba3af]">Connect Bidder A, shield once, disconnect, switch Ready X to Bidder B, and repeat. The auction CLI will refuse to start until both deposits are at least ten blocks old.</p>
        </section>
        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
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
