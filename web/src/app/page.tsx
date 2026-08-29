'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [auctionId, setAuctionId] = useState('1')
  const safeAuctionId = /^[1-9][0-9]{0,19}$/.test(auctionId) ? auctionId : '1'

  return (
    <main className="cipherbid-auction-page min-h-screen bg-[#08090a] px-5 text-[#f7f8f8] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex min-h-16 items-center justify-between border-b border-white/[0.08]">
          <span className="text-lg font-semibold tracking-[-0.04em]">CipherBid</span>
          <Link href="/create" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#d7dcff]">
            Create auction
          </Link>
        </header>

        <section className="grid min-h-[calc(100vh-4rem)] items-center gap-12 py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#a8b1ff]">
              STRK20 · Starknet · Vickrey auctions
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.065em] sm:text-7xl lg:text-8xl">
              Private bids. Guaranteed onchain delivery.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#9ba3af]">
              Every bidder locks the same public STRK cap. Bid amounts stay sealed until reveal, while the NFT remains
              in contract custody for atomic settlement.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/create"
                className="inline-flex min-h-12 items-center rounded-xl bg-[#6654d9] px-6 font-semibold text-white"
              >
                Create an auction
              </Link>
              <a
                href="#open-auction"
                className="inline-flex min-h-12 items-center rounded-xl border border-white/10 bg-white/[0.04] px-6 font-semibold"
              >
                Open live auction
              </a>
            </div>
          </div>

          <aside
            id="open-auction"
            className="rounded-3xl border border-white/10 bg-[#111217] p-6 shadow-[0_30px_80px_-50px_rgba(113,112,255,0.8)] sm:p-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#a8b1ff]">Live chain reader</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Open an auction</h2>
            <p className="mt-3 text-sm leading-6 text-[#9ba3af]">
              CipherBid validates the deployed class, pool, token, auction state, bids, and NFT owner before rendering
              values.
            </p>
            <label htmlFor="home-auction-id" className="mt-6 block text-sm font-medium">
              Auction ID
            </label>
            <input
              id="home-auction-id"
              aria-label="Auction ID"
              inputMode="numeric"
              value={auctionId}
              onChange={(event) => setAuctionId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xl font-semibold outline-none focus:border-[#a8b1ff]"
            />
            <Link
              href={`/auctions/${safeAuctionId}`}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 font-semibold text-[#111217]"
            >
              Open auction
            </Link>
            <dl className="mt-7 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <dt className="text-[#858b98]">Bid privacy</dt>
                <dd className="mt-1 font-semibold">Sealed until reveal</dd>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <dt className="text-[#858b98]">Delivery</dt>
                <dd className="mt-1 font-semibold">Atomic ERC-721</dd>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <dt className="text-[#858b98]">Claims</dt>
                <dd className="mt-1 font-semibold">STRK20 open notes</dd>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                <dt className="text-[#858b98]">Credentials</dt>
                <dd className="mt-1 font-semibold">Encrypted locally</dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  )
}
