import { AuctionBidPreview } from '@/features/auction/ui/AuctionBidPreview'

function displayAuctionId(value: string): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 80)
  return normalized.length > 0 ? normalized : 'unknown'
}

export default async function AuctionPage({
  params,
}: Readonly<{
  params: Promise<{ auctionId: string }>
}>) {
  const { auctionId } = await params
  return <AuctionBidPreview auctionId={displayAuctionId(auctionId)} />
}
