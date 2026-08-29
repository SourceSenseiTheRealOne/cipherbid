import { Suspense } from 'react'
import { AuctionPageClient, AuctionPageLoading } from '@/features/auction/ui/AuctionPageClient'

export default function AuctionPage() {
  return (
    <Suspense fallback={<AuctionPageLoading />}>
      <AuctionPageClient />
    </Suspense>
  )
}
