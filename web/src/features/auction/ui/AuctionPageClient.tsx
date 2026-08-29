'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loadAuctionLiveViewModel } from '@/features/auction/auctionBrowserLoader'
import { parseAuctionIdValues } from '@/features/auction/auctionRoute'
import { AuctionLivePage, type AuctionLiveViewModel } from '@/features/auction/ui/AuctionLivePage'

export type AuctionModelLoader = (auctionId: bigint) => Promise<AuctionLiveViewModel>

type LoadState =
  | Readonly<{ status: 'ready'; requestKey: string; model: AuctionLiveViewModel }>
  | Readonly<{ status: 'error'; requestKey: string }>

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
  const [state, setState] = useState<LoadState | null>(null)
  const requestKey = route.ok ? `${route.canonicalId}:${retry}` : ''

  useEffect(() => {
    if (!route.ok) return

    let active = true
    const activeRequestKey = requestKey
    void loadModel(route.auctionId).then(
      (model) => {
        if (active) setState({ status: 'ready', requestKey: activeRequestKey, model })
      },
      () => {
        if (active) setState({ status: 'error', requestKey: activeRequestKey })
      },
    )

    return () => {
      active = false
    }
  }, [loadModel, requestKey, route])

  if (!route.ok) {
    return <AuctionLivePage error={route.error} auctionId={route.displayId} />
  }

  if (!state || state.requestKey !== requestKey) {
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
