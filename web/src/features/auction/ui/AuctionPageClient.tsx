'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loadAuctionLiveViewModel } from '@/features/auction/auctionBrowserLoader'
import { parseAuctionIdValues } from '@/features/auction/auctionRoute'
import { AuctionLivePage, type AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'

export type AuctionModelLoader = (auctionId: bigint) => Promise<AuctionLiveViewModel>

type LoadState =
  | Readonly<{ status: 'loading'; auctionId: string }>
  | Readonly<{ status: 'ready'; auctionId: string; model: AuctionLiveViewModel }>
  | Readonly<{ status: 'error'; auctionId: string }>

export function AuctionPageLoading({ auctionId = '' }: Readonly<{ auctionId?: string }>) {
  return (
    <main className="cipherbid-auction-page min-h-screen bg-[#08090a] px-5 py-16 text-[#f7f8f8] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-lg font-semibold tracking-[-0.04em]">
          CipherBid
        </Link>
        <p role="status" className="mt-10 text-base text-[#9ba3af]">
          {auctionId ? `Loading auction #${auctionId} from public RPC…` : 'Loading auction from public RPC…'}
        </p>
      </div>
    </main>
  )
}

export function AuctionPageClient({
  loadModel = loadAuctionLiveViewModel,
}: Readonly<{ loadModel?: AuctionModelLoader }>) {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const route = useMemo(() => parseAuctionIdValues(new URLSearchParams(query).getAll('id')), [query])
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading', auctionId: '' })

  useEffect(() => {
    if (!route.ok) return

    let active = true
    const canonicalId = route.canonicalId
    setState({ status: 'loading', auctionId: canonicalId })
    void loadModel(route.auctionId).then(
      (model) => {
        if (active) setState({ status: 'ready', auctionId: canonicalId, model })
      },
      () => {
        if (active) setState({ status: 'error', auctionId: canonicalId })
      },
    )

    return () => {
      active = false
    }
  }, [loadModel, retry, route])

  if (!route.ok) {
    return <AuctionLivePage error={route.error} auctionId={route.displayId} />
  }

  if (state.auctionId !== route.canonicalId || state.status === 'loading') {
    return <AuctionPageLoading auctionId={route.canonicalId} />
  }

  if (state.status === 'error') {
    return (
      <AuctionLivePage
        error="The requested onchain auction state could not be verified from public RPC."
        auctionId={route.canonicalId}
        onRetry={() => setRetry((attempt) => attempt + 1)}
      />
    )
  }

  return <AuctionLivePage model={state.model} />
}
