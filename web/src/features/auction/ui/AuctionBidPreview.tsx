import Link from 'next/link'
import { SEPOLIA_STRK20_POOL } from '@/lib/starknet/network'
import { SecondPriceIllustration } from './SecondPriceIllustration'

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
  return <dd className="mt-2 text-2xl font-semibold tabular-nums text-[#18171b]">—</dd>
}

export function AuctionBidPreview({ auctionId }: AuctionBidPreviewProps) {
  return (
    <div className="cipherbid-auction-page min-h-screen bg-[#f3f0e9] text-[#18171b]">
      <header className="border-b border-black/10 bg-[#f3f0e9]/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-semibold tracking-[-0.035em] outline-offset-4">
              CipherBid
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-6 text-sm text-black/70 sm:flex">
              <span className="font-medium text-black">Auctions</span>
              <a href="#privacy" className="outline-offset-4 transition-colors hover:text-black">
                How privacy works
              </a>
            </nav>
          </div>
          <span className="inline-flex min-h-11 items-center rounded-full border border-black/10 bg-white/45 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-black/70">
            Wallet not connected
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-16">
        <section aria-labelledby="auction-title" className="mb-9 border-b border-black/10 pb-9 sm:mb-12 sm:pb-12">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            <Link href="/" className="text-black/70 outline-offset-4 transition-colors hover:text-black">
              Auctions
            </Link>
            <span aria-hidden="true" className="text-black/25">
              /
            </span>
            <span className="text-black/70">Auction</span>
            <code className="max-w-full overflow-hidden text-ellipsis rounded-md border border-black/10 bg-white/55 px-2.5 py-1 font-mono text-[11px] normal-case tracking-normal text-black/65">
              {auctionId}
            </code>
          </nav>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-[#6654d9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.13em] text-white">
              Design preview
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#298a68]/25 bg-[#dff2e9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.13em] text-[#176348]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#23845f]" aria-hidden="true" />
              Bidding open
            </span>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold text-[#6654d9]">STRK20-funded Vickrey auction</p>
              <h1
                id="auction-title"
                className="max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl"
              >
                A genuinely sealed NFT auction
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-black/58 lg:pb-1">
              Bidders lock the same public STRK collateral while their actual amounts remain sealed until reveal. The
              winner pays the second price.
            </p>
          </div>
        </section>

        <div data-testid="auction-layout" className="grid min-w-0 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <section
            aria-labelledby="lot-title"
            data-testid="auction-lot"
            className="min-w-0 overflow-hidden rounded-[1.4rem] border border-black/10 bg-[#19171f] text-white lg:col-span-7 lg:col-start-1 lg:row-start-1"
          >
            <h2 id="lot-title" className="sr-only">
              NFT lot
            </h2>
            <div
              className="cipherbid-auction-art relative flex min-h-[22rem] items-center justify-center overflow-hidden sm:min-h-[32rem]"
              aria-hidden="true"
            >
              <div className="absolute inset-[14%] rotate-6 rounded-[2rem] border border-white/20 bg-white/5 shadow-2xl backdrop-blur-sm" />
              <div className="absolute inset-[22%] -rotate-6 rounded-full border border-white/30" />
              <div className="absolute h-28 w-28 rounded-full border border-white/35 bg-black/20 shadow-[0_0_90px_rgba(190,170,255,0.45)] sm:h-40 sm:w-40" />
              <span className="relative font-mono text-xs font-semibold uppercase tracking-[0.32em] text-white/85">
                NFT lot
              </span>
            </div>
            <div className="grid gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
              {['Collection', 'Token ID', 'Custody'].map((label) => (
                <dl key={label} className="bg-[#19171f] px-5 py-4">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">{label}</dt>
                  <dd className="mt-2 break-words text-sm font-medium text-white/78">Awaiting chain data</dd>
                </dl>
              ))}
            </div>
          </section>

          <aside
            data-testid="bid-preview-card"
            className="min-w-0 rounded-[1.4rem] border border-black/10 bg-[#1b1921] p-5 text-white shadow-[0_24px_70px_-45px_rgba(30,22,65,0.75)] sm:p-7 lg:sticky lg:top-8 lg:col-span-5 lg:col-start-8 lg:row-span-6 lg:row-start-1"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#b7aaff]">
                  Private bid composition
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Place a private bid</h2>
              </div>
              <span className="shrink-0 rounded-full border border-[#b7aaff]/25 bg-[#7664df]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#c9c0ff]">
                STRK20 route required
              </span>
            </div>

            <div className="mt-7">
              <label htmlFor="bid-amount" className="text-xs font-semibold text-white/75">
                Bid amount
              </label>
              <div className="mt-2 flex min-h-16 items-center rounded-xl border border-white/12 bg-white/[0.045] px-4 focus-within:border-[#9c8cff]">
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
                <div className="h-full w-0 rounded-full bg-[#8c7cf1]" />
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

            <div className="mt-6 rounded-xl border border-[#85d4b3]/20 bg-[#4ba77c]/10 p-4 text-sm leading-6 text-white/85">
              Your actual bid stays sealed until reveal. The equal collateral transfer is public and identical for every
              bidder.
            </div>

            <button
              type="button"
              disabled
              className="mt-5 min-h-12 w-full cursor-not-allowed rounded-xl bg-[#5d4cab] px-5 text-sm font-bold text-white"
            >
              Bidding unavailable in design preview
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-white/65">
              No wallet request or transaction is performed on this page.
            </p>
          </aside>

          <section aria-label="Auction facts" className="grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:col-start-1">
            {facts.map((label) => (
              <dl
                key={label}
                data-testid={`fact-${label.toLowerCase().replaceAll(' ', '-')}`}
                className="rounded-2xl border border-black/10 bg-white/55 p-5"
              >
                <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/70">{label}</dt>
                <PlaceholderValue />
              </dl>
            ))}
          </section>

          <SecondPriceIllustration />

          <section
            aria-labelledby="mechanism-title"
            className="rounded-[1.4rem] border border-black/10 bg-[#e9e4da] p-5 sm:p-7 lg:col-span-7 lg:col-start-1"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6654d9]">Vickrey lifecycle</p>
            <h2 id="mechanism-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              How the auction clears
            </h2>
            <ol className="mt-7 divide-y divide-black/10 border-y border-black/10">
              {lifecycle.map((item) => (
                <li key={item.step} className="grid gap-2 py-5 sm:grid-cols-[3rem_1fr] sm:gap-4">
                  <span className="font-mono text-xs font-bold text-[#6654d9]">{item.step}</span>
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
            className="scroll-mt-8 rounded-[1.4rem] border border-black/10 bg-white/55 p-5 sm:p-7 lg:col-span-7 lg:col-start-1"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6654d9]">Privacy boundary</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">What stays private—and what does not</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#2d8967]/20 bg-[#e1f1e9] p-5">
                <h3 className="text-sm font-bold text-[#195e47]">Private before reveal</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#245e4b]">
                  <li>Committed bid amount</li>
                  <li>Bidder-to-action link, subject to timing correlation</li>
                  <li>Commitment opening until the reveal phase</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[#eeeae2] p-5">
                <h3 className="text-sm font-bold">Public by design</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-black/58">
                  <li>NFT, reserve, cap, deadlines, and bid timing/count</li>
                  <li>Equal collateral transfer and helper interaction</li>
                  <li>Revealed bids, winner, and clearing price after close</li>
                </ul>
              </div>
            </div>
            <p className="mt-5 border-l-2 border-[#6654d9] pl-4 text-sm leading-6 text-black/58">
              Deposits, withdrawals, timing, open-note amounts, and app-side helper activity can remain public.
            </p>
          </section>

          <section
            aria-labelledby="evidence-title"
            className="rounded-[1.4rem] border border-black/10 bg-[#ded8cd] p-5 sm:p-7 lg:col-span-7 lg:col-start-1"
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
