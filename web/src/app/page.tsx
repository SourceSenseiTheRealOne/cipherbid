'use client'

import { useState } from 'react'
import Link from 'next/link'
import { buildAuctionHref } from '@/features/auction/auctionRoute'

const proofFacts = [
  ['Bid privacy', 'Sealed until reveal'],
  ['Delivery', 'Atomic ERC-721'],
  ['Claims', 'STRK20 open notes'],
  ['Credentials', 'Encrypted locally'],
] as const

export default function Home() {
  const [auctionId, setAuctionId] = useState('1')
  const safeAuctionId = /^[1-9][0-9]{0,19}$/.test(auctionId) ? auctionId : '1'

  return (
    <main className="cipherbid-auction-page px-5 sm:px-8 lg:px-10">
      <div className="cb-shell">
        <header className="cb-nav">
          <Link href="/" className="cb-wordmark">
            CipherBid
          </Link>
          <Link href="/create" className="cb-nav-link">
            Create auction
          </Link>
        </header>

        <section className="cb-hero">
          <div className="cb-hero-copy">
            <p className="cb-kicker">STRK20 · Starknet · Vickrey auctions</p>
            <h1 className="cb-display">Private bids. Guaranteed onchain delivery.</h1>
            <p className="cb-hero-lead">
              Every bidder locks the same public STRK cap. Bid amounts stay sealed until reveal, while the NFT remains
              in contract custody for atomic settlement.
            </p>
            <div className="cb-actions">
              <Link href="/create" className="cb-primary">
                Create an auction
              </Link>
              <a href="#open-auction" className="cb-secondary">
                Open live auction
              </a>
            </div>
          </div>

          <section id="open-auction" aria-label="Live auction reader" className="cb-panel cb-reader">
            <span className="cb-reader-mark">LIVE RPC READER</span>
            <h2 className="cb-display mt-3 text-3xl">Open an auction</h2>
            <p className="cb-copy mt-4 text-sm">
              CipherBid validates the deployed class, pool, token, auction state, bids, and NFT owner before rendering
              values.
            </p>
            <label htmlFor="home-auction-id" className="mt-8 block text-sm font-semibold text-[var(--cb-text-soft)]">
              Auction ID
            </label>
            <input
              id="home-auction-id"
              aria-label="Auction ID"
              inputMode="numeric"
              value={auctionId}
              onChange={(event) => setAuctionId(event.target.value)}
              className="cb-control mt-2 w-full px-4 text-xl font-semibold outline-none"
            />
            <Link href={buildAuctionHref(safeAuctionId)} className="cb-primary mt-3 w-full">
              Open auction
            </Link>
          </section>
        </section>

        <dl data-testid="home-proof-strip" className="cb-proof-strip mb-12">
          {proofFacts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  )
}
