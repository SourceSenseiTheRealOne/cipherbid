import Link from 'next/link'
import { SEPOLIA_STRK20_POOL } from '@/lib/starknet/network'
import { ProtocolConsole } from './ProtocolConsole'
import { SecondPriceIllustration } from './SecondPriceIllustration'
import { WalletConnectPanel } from '@/features/wallet/WalletConnectPanel'

export type AuctionBidPreviewProps = Readonly<{
  auctionId: string
}>

const facts = ['Reserve', 'Uniform collateral cap', 'Bid deadline', 'Reveal window'] as const

const lifecycle = [
  {
    step: '01',
    title: 'Lock equal collateral',
    description: 'Every bidder uses the same public STRK cap, so the collateral leg does not expose the bid amount.',
  },
  {
    step: '02',
    title: 'Reveal the committed amount',
    description: 'After bidding closes, each valid opening proves which sealed commitment it belongs to.',
  },
  {
    step: '03',
    title: 'Highest bidder pays second price',
    description: 'The winner receives the NFT and pays the greater of the reserve or second-highest valid bid.',
  },
] as const

function PlaceholderValue() {
  return <dd className="mt-2 text-2xl font-medium tabular-nums text-[var(--cb-text)]">—</dd>
}

export function AuctionBidPreview({ auctionId }: AuctionBidPreviewProps) {
  return (
    <div className="cipherbid-auction-page">
      <header className="border-b border-white/[0.07] bg-[var(--cb-canvas)]/95 backdrop-blur-xl">
        <div className="cb-shell flex flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
          <div className="flex items-center gap-8">
            <Link href="/" className="cb-wordmark outline-offset-4">
              CipherBid
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-6 text-sm text-[#9ba3af] sm:flex">
              <span className="font-medium text-[#f7f8f8]">Auctions</span>
              <a href="#privacy" className="outline-offset-4 transition-colors hover:text-[#f7f8f8]">
                How privacy works
              </a>
            </nav>
          </div>
          <span className="inline-flex min-h-11 items-center rounded-full border border-[var(--cb-accent)]/25 bg-[var(--cb-accent-soft)] px-4 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--cb-accent-strong)]">
            Read-only preview
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
        <section aria-labelledby="auction-title" className="mb-9 border-b border-white/[0.07] pb-9 sm:mb-12 sm:pb-12">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em]"
          >
            <Link href="/" className="text-[#9ba3af] outline-offset-4 transition-colors hover:text-[#f7f8f8]">
              Auctions
            </Link>
            <span aria-hidden="true" className="text-white/25">
              /
            </span>
            <span className="text-[#9ba3af]">Auction</span>
            <code className="max-w-full overflow-hidden text-ellipsis rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1 font-mono text-[11px] normal-case tracking-normal text-[#c8ced8]">
              {auctionId}
            </code>
          </nav>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-[var(--cb-accent)]/40 bg-[var(--cb-accent-soft)] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--cb-accent-strong)]">
              Design preview
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#27a644]/30 bg-[#27a644]/10 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#9be1af]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#23845f]" aria-hidden="true" />
              Bid ingress model
            </span>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <p className="cb-kicker mb-3">STRK20-funded Vickrey auction</p>
              <h1
                id="auction-title"
                className="max-w-4xl text-4xl font-medium leading-[0.98] tracking-[-0.06em] text-[#f7f8f8] sm:text-6xl lg:text-7xl"
              >
                A genuinely sealed NFT auction
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-[#9ba3af] lg:pb-1">
              Bidders lock the same public STRK collateral while their actual amounts remain sealed until reveal. The
              winner pays the second price.
            </p>
          </div>
        </section>

        <div data-testid="auction-layout" className="grid min-w-0 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <section
            aria-labelledby="lot-title"
            data-testid="auction-lot"
            className="cb-panel min-w-0 overflow-hidden text-white lg:col-span-7 lg:col-start-1 lg:row-start-1"
          >
            <h2 id="lot-title" className="sr-only">
              NFT lot
            </h2>
            <div
              className="cipherbid-auction-art relative flex min-h-[22rem] items-center justify-center overflow-hidden sm:min-h-[32rem]"
              aria-hidden="true"
            >
              <div className="absolute inset-[14%] border border-[var(--cb-accent)]/20 bg-white/[0.025]" />
              <div className="absolute inset-[22%] border border-white/20" />
              <div className="absolute h-28 w-28 border border-[var(--cb-accent)]/45 bg-black/20 sm:h-40 sm:w-40" />
              <span className="relative font-mono text-xs font-semibold uppercase tracking-[0.32em] text-white/85">
                NFT lot
              </span>
            </div>
            <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
              {['Collection', 'Token ID', 'Custody'].map((label) => (
                <dl key={label} className="bg-[var(--cb-surface-raised)] px-5 py-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">{label}</dt>
                  <dd className="mt-2 break-words text-sm font-medium text-white/78">Awaiting chain data</dd>
                </dl>
              ))}
            </div>
          </section>

          <ProtocolConsole />

          <aside
            data-testid="bid-preview-card"
            className="cb-panel min-w-0 p-5 text-white sm:p-7 lg:sticky lg:top-8 lg:col-span-5 lg:col-start-8 lg:row-span-6 lg:row-start-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cb-kicker">Private bid composition</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Place a private bid</h2>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--cb-accent)]/25 bg-[var(--cb-accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--cb-accent-strong)]">
                STRK20 route required
              </span>
            </div>

            <div className="mt-6 border border-white/10 bg-white/[0.025] p-4">
              <WalletConnectPanel />
            </div>

            <div className="mt-7">
              <label htmlFor="bid-amount" className="text-xs font-semibold text-white/75">
                Bid amount
              </label>
              <div className="cb-control mt-2 flex min-h-16 items-center px-4">
                <input
                  id="bid-amount"
                  disabled
                  inputMode="decimal"
                  placeholder="Enter amount"
                  className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-white/25 disabled:cursor-not-allowed"
                />
                <span className="font-mono text-xs font-bold tracking-[0.12em] text-white/70">STRK</span>
              </div>
            </div>

            <div className="mt-4" aria-label="Collateral cap meter">
              <div className="flex justify-between text-[11px] font-medium text-white/70">
                <span>Uniform cap</span>
                <span>Awaiting chain data</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-0 rounded-full bg-[var(--cb-accent)]" />
              </div>
            </div>

            <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
              {['Your sealed bid', 'Public collateral', 'Potential refund'].map((label) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="text-white/70">{label}</dt>
                  <dd className="font-mono font-semibold text-white/75">—</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 border-l-2 border-[var(--cb-accent)] bg-[var(--cb-accent-soft)] p-4 text-sm leading-6 text-white/85">
              Your actual bid stays sealed until reveal. The equal collateral transfer is public and identical for every
              bidder.
            </div>

            <button type="button" disabled className="cb-primary mt-5 w-full cursor-not-allowed text-sm">
              Bidding unavailable in design preview
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-white/65">
              Wallet connection is available here. Bidding remains disabled until the live STRK20 route is verified.
            </p>
          </aside>

          <section aria-label="Auction facts" className="grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:col-start-1">
            {facts.map((label) => (
              <dl
                key={label}
                data-testid={`fact-${label.toLowerCase().replaceAll(' ', '-')}`}
                className="border-t border-white/[0.08] p-5"
              >
                <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#858b98]">
                  {label}
                </dt>
                <PlaceholderValue />
              </dl>
            ))}
          </section>

          <SecondPriceIllustration />

          <section
            aria-labelledby="mechanism-title"
            className="cb-panel cipherbid-panel p-5 sm:p-7 lg:col-span-7 lg:col-start-1"
          >
            <p className="cb-kicker">Vickrey lifecycle</p>
            <h2 id="mechanism-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              How the auction clears
            </h2>
            <ol className="mt-7 divide-y divide-black/10 border-y border-black/10">
              {lifecycle.map((item) => (
                <li key={item.step} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr] sm:gap-4">
                  <span className="font-mono text-xs font-bold text-[var(--cb-accent)]">{item.step}</span>
                  <div>
                    <h3 className="font-semibold tracking-[-0.02em]">{item.title}</h3>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-black/70">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm leading-6 text-black/58">
              Revealed bids and the clearing price become public after the bidding phase. CipherBid does not promise
              permanent amount privacy.
            </p>
          </section>

          <section
            id="privacy"
            aria-label="Private and public auction data"
            className="cb-panel cipherbid-panel scroll-mt-8 p-5 sm:p-7 lg:col-span-7 lg:col-start-1"
          >
            <p className="cb-kicker">Privacy boundary</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">What stays private—and what does not</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="border border-[var(--cb-accent)]/20 bg-[var(--cb-accent-soft)] p-5">
                <h3 className="text-sm font-bold text-[#195e47]">Private before reveal</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#245e4b]">
                  <li>Committed bid amount</li>
                  <li>Bidder-to-action link, subject to timing correlation</li>
                  <li>Commitment opening until the reveal phase</li>
                </ul>
              </div>
              <div className="border border-black/10 bg-[#eeeae2] p-5">
                <h3 className="text-sm font-bold">Public by design</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-black/58">
                  <li>NFT, reserve, cap, deadlines, and bid timing/count</li>
                  <li>Equal collateral transfer and helper interaction</li>
                  <li>Revealed bids, winner, and clearing price after close</li>
                </ul>
              </div>
            </div>
            <p className="mt-5 border-l-2 border-[var(--cb-accent)] pl-4 text-sm leading-6 text-black/58">
              Deposits, withdrawals, timing, open-note amounts, and app-side helper activity can remain public.
            </p>
          </section>

          <section
            aria-labelledby="evidence-title"
            className="cb-panel cipherbid-panel p-5 sm:p-7 lg:col-span-7 lg:col-start-1"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/70">Chain evidence</p>
                <h2 id="evidence-title" className="mt-2 text-xl font-semibold tracking-[-0.035em]">
                  Verified configuration boundary
                </h2>
              </div>
              <span className="rounded-full border border-black/10 bg-white/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black/70">
                Read-only context
              </span>
            </div>
            <dl className="mt-6 divide-y divide-black/10 border-y border-black/10 text-sm">
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5">
                <dt className="text-black/70">Network</dt>
                <dd className="font-mono font-semibold">Starknet Sepolia</dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5">
                <dt className="text-black/70">Auction contract</dt>
                <dd className="font-mono text-black/62">Awaiting deployment</dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5">
                <dt className="text-black/70">STRK20 pool</dt>
                <dd className="break-all font-mono text-xs leading-6 text-black/68">{SEPOLIA_STRK20_POOL}</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  )
}
