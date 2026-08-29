import { loadDeploymentManifest, type DeploymentManifest } from '@/config/deployment'
import { SellerCreatePage } from '@/features/auction/ui/SellerCreatePage'

export const dynamic = 'force-dynamic'

export default function CreateAuctionRoute() {
  let deployment: DeploymentManifest | undefined
  try {
    deployment = loadDeploymentManifest(process.env)
  } catch {
    deployment = undefined
  }
  return deployment ? (
    <SellerCreatePage deployment={deployment} />
  ) : (
    <SellerCreatePage error="Auction deployment is not configured or is invalid." />
  )
}
