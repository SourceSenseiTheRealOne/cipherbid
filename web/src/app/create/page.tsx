import { loadDeploymentManifest } from '@/config/deployment'
import { SellerCreatePage } from '@/features/auction/ui/SellerCreatePage'

export const dynamic = 'force-dynamic'

export default function CreateAuctionRoute() {
  try {
    return <SellerCreatePage deployment={loadDeploymentManifest(process.env)} />
  } catch {
    return <SellerCreatePage error="Auction deployment is not configured or is invalid." />
  }
}
