'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { RpcProvider } from 'starknet'
import { WalletConnectPanel } from '@/features/wallet/WalletConnectPanel'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'
import { AuctionActions } from '@/features/auction/ui/AuctionActions'
import { formatTokenAmount, formatUnixTimestamp } from '@/features/auction/auctionMath'

export type AuctionLiveBid = Readonly<{
  commitment: string
  claimHandle: string
  revealed: boolean
  amount: string
  assetRecipient: string
}>

export type AuctionLiveViewModel = Readonly<{
  network: 'sepolia' | 'mainnet'
  chainId: string
  rpcUrl: string
  auctionHouse: string
  auctionHouseClassHash: string
  strk20Pool: string
  paymentToken: string
  auctionId: string
  seller: string
  sellerClaimHandle: string
  nftContract: string
  tokenId: string
  reservePrice: string
  cap: string
  biddingDeadline: string
  revealDeadline: string
  bidderLimit: number
  nftOwner: string
  custodyValid: boolean
  state: Readonly<{
    settled: boolean
    sold: boolean
    winnerIndex: number
    winnerCommitment: string
    winnerRecipient: string
    clearingPrice: string
    sellerEntitlement: string
    sellerAuthorizedNote: string
    sellerClaimConsumed: boolean
  }>
  bids: readonly AuctionLiveBid[]
}>

type AuctionLivePageProps =
  | Readonly<{ model: AuctionLiveViewModel; error?: never; auctionId?: never }>
  | Readonly<{ model?: never; error: string; auctionId: string; onRetry?: () => void }>

function short(value: string): string {
  return value.length <= 18 ? value : `${value.slice(0, 10)}…${value.slice(-6)}`
}

function strk(value: string): string {
  return `${formatTokenAmount(BigInt(value), 18)} STRK`
}

function phase(model: AuctionLiveViewModel): string {
  if (model.state.settled) return model.state.sold ? 'Sold' : 'No sale'
  const now = BigInt(Math.floor(Date.now() / 1000))
  if (now < BigInt(model.biddingDeadline)) return 'Bidding open'
  if (now < BigInt(model.revealDeadline)) return 'Reveal open'
  return 'Ready to settle'
}

export function AuctionLivePage(props: AuctionLivePageProps) {
  const [connection, setConnection] = useState<PrivacyWalletConnection | null>(null)
  const rpcUrl = props.model?.rpcUrl
  const provider = useMemo(() => (rpcUrl ? new RpcProvider({ nodeUrl: rpcUrl }) : undefined), [rpcUrl])

  if (!props.model) {
    return (
      <main className="cipherbid-auction-page min-h-screen bg-[#08090a] px-5 py-16 text-[#f7f8f8] sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-lg font-semibold tracking-[-0.04em]">
            CipherBid
          </Link>
          <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-[#a8b1ff]">
            Auction #{props.auctionId}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Live auction unavailable</h1>
          <p role="alert" className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100">
            {props.error}
          </p>
          {props.onRetry ? (
            <button
              type="button"
              onClick={props.onRetry}
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-5 font-semibold text-[#111217]"
            >
              Retry public read
            </button>
          ) : null}
        </div>
      </main>
    )
  }

  const model = props.model
  const status = phase(model)
  return (
    <div className="cipherbid-auction-page min-h-screen bg-[#08090a] text-[#f7f8f8]">
      <header className="border-b border-white/[0.08] bg-[#08090a]/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link href="/" className="text-lg font-semibold tracking-[-0.04em] outline-offset-4">
            CipherBid
          </Link>
          <span className="rounded-full border border-[#7170ff]/30 bg-[#7170ff]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#d7dcff]">
            {model.network} · live chain data
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
        <section className="border-b border-white/[0.08] pb-8" aria-labelledby="live-auction-title">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#3bc478]/25 bg-[#3bc478]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#aee5c1]">
              {status}
            </span>
            <span className="font-mono text-xs text-[#858b98]">
              {model.bids.length}/{model.bidderLimit} bids
            </span>
          </div>
          <h1 id="live-auction-title" className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
            Auction #{model.auctionId}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#9ba3af]">
            Private equal-cap bidding with deterministic second-price settlement and atomic NFT delivery.
          </p>
        </section>

        <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            <section
              aria-label="NFT custody"
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#101116]"
            >
              <div className="cipherbid-auction-art flex min-h-64 items-center justify-center">
                <div className="text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a8b1ff]">ERC-721 lot</p>
                  <p className="mt-3 text-3xl font-semibold">Token #{model.tokenId}</p>
                </div>
              </div>
              <dl className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
                <div className="bg-[#111217] p-4">
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[#858b98]">Contract</dt>
                  <dd className="mt-2 font-mono text-xs" title={model.nftContract}>
                    {short(model.nftContract)}
                  </dd>
                </div>
                <div className="bg-[#111217] p-4">
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[#858b98]">Current owner</dt>
                  <dd className="mt-2">
                    <code className="font-mono text-xs">{model.nftOwner}</code>
                  </dd>
                </div>
                <div className="bg-[#111217] p-4">
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[#858b98]">Delivery</dt>
                  <dd className="mt-2 text-sm font-semibold text-[#aee5c1]">
                    {model.custodyValid ? 'Custody verified' : 'Custody mismatch'}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-label="Live auction facts" className="grid gap-3 sm:grid-cols-2">
              {[
                ['Reserve', strk(model.reservePrice)],
                ['Uniform collateral cap', strk(model.cap)],
                ['Bid deadline', formatUnixTimestamp(BigInt(model.biddingDeadline))],
                ['Reveal deadline', formatUnixTimestamp(BigInt(model.revealDeadline))],
              ].map(([label, value]) => (
                <dl key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#858b98]">{label}</dt>
                  <dd className="mt-2 break-all text-xl font-semibold tabular-nums">{value}</dd>
                </dl>
              ))}
            </section>

            <section
              aria-labelledby="bids-title"
              className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]"
            >
              <div className="border-b border-white/[0.08] p-5">
                <h2 id="bids-title" className="text-xl font-semibold">
                  Accepted bids
                </h2>
                <p className="mt-1 text-sm text-[#9ba3af]">Amounts appear only after successful reveal.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#858b98]">
                    <tr>
                      <th className="px-5 py-3">Commitment</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07]">
                    {model.bids.map((bid, index) => {
                      const winner = model.state.settled && model.state.sold && index === model.state.winnerIndex
                      return (
                        <tr key={`${bid.commitment}-${index}`}>
                          <td className="px-5 py-4 font-mono text-xs" title={bid.commitment}>
                            {short(bid.commitment)}
                          </td>
                          <td className="px-5 py-4 font-semibold">{bid.revealed ? strk(bid.amount) : 'Sealed'}</td>
                          <td className="px-5 py-4 text-[#9ba3af]">
                            {winner ? 'Winner' : model.state.settled ? 'Refund eligible' : 'Pending'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:col-span-5">
            <section
              className="rounded-2xl border border-white/10 bg-[#111217] p-5 sm:p-6"
              aria-labelledby="settlement-title"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8b1ff]">
                Atomic delivery receipt
              </p>
              <h2 id="settlement-title" className="mt-2 text-2xl font-semibold">
                Settlement state
              </h2>
              <dl className="mt-5 divide-y divide-white/[0.08] border-y border-white/[0.08] text-sm">
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-[#9ba3af]">Status</dt>
                  <dd className="font-semibold">{status}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-[#9ba3af]">Clearing price</dt>
                  <dd className="font-semibold">{model.state.settled ? strk(model.state.clearingPrice) : 'Pending'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-[#9ba3af]">Winner</dt>
                  <dd className="font-mono text-xs">{model.state.sold ? short(model.state.winnerRecipient) : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-[#9ba3af]">Seller proceeds</dt>
                  <dd className="font-semibold">
                    {model.state.settled ? strk(model.state.sellerEntitlement) : 'Pending'}
                  </dd>
                </div>
              </dl>
            </section>

            <WalletConnectPanel
              provider={provider}
              expectedChainId={model.chainId}
              expectedNetworkLabel={model.network === 'mainnet' ? 'Starknet mainnet' : 'Starknet Sepolia'}
              onConnected={setConnection}
              onDisconnected={() => setConnection(null)}
            />

            <AuctionActions model={model} connection={connection} />

            <section className="rounded-2xl border border-[#7170ff]/20 bg-[#7170ff]/10 p-5 text-sm leading-6 text-[#d7dcff]">
              Transaction actions unlock after a compatible wallet connects. CipherBid never reads wallet viewing keys,
              notes, or proof witnesses.
            </section>

            <section
              aria-label="Deployment identity"
              className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
            >
              <h2 className="text-base font-semibold">Verified deployment</h2>
              <dl className="mt-4 space-y-3 text-xs">
                <div>
                  <dt className="text-[#858b98]">Auction house</dt>
                  <dd className="mt-1 break-all font-mono">{model.auctionHouse}</dd>
                </div>
                <div>
                  <dt className="text-[#858b98]">STRK20 pool</dt>
                  <dd className="mt-1 break-all font-mono">{model.strk20Pool}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
