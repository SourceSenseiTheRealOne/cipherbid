import { DemoBidderSetupPage } from '@/features/demo/ui/DemoBidderSetupPage'
import { loadDeploymentManifest } from '@/config/deployment'

export default function DemoSetupRoute() {
  return <DemoBidderSetupPage deployment={loadDeploymentManifest(process.env)} />
}
