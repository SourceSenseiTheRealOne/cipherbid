import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DemoBidderSetupPanel } from '@/features/demo/ui/DemoBidderSetupPage'
import { MAINNET_DEMO_BIDDER_CONFIG, SEPOLIA_DEMO_BIDDER_CONFIG } from '@/features/demo/demoBidderShield'
import { MAINNET_BIDDER_A, MAINNET_DEPLOYER } from '@/config/mainnetRelease'
import { MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID } from '@/config/deployment'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'

const connection = {
  account: {},
  address: MAINNET_BIDDER_A,
  chainId: MAINNET_CHAIN_ID,
  walletApiVersions: ['0.10.3'],
  supportsStrk20: true,
} satisfies PrivacyWalletConnection

describe('DemoBidderSetupPanel', () => {
  it('submits the connected bidder shield flow and shows the public transaction hash', async () => {
    const user = userEvent.setup()
    const shield = vi.fn().mockResolvedValue({ bidder: 'Bidder A', transactionHash: '0x123' })
    render(<DemoBidderSetupPanel connection={connection} config={MAINNET_DEMO_BIDDER_CONFIG} shield={shield} />)

    expect(screen.getByText('Bidder A connected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Activate Bidder A' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Shield 24 STRK for Bidder A' }))

    expect(shield).toHaveBeenCalledWith(connection, MAINNET_DEMO_BIDDER_CONFIG)
    expect(await screen.findByRole('status')).toHaveTextContent('Shield transaction submitted')
    expect(screen.getByRole('link', { name: /0x123/ })).toHaveAttribute(
      'href',
      'https://voyager.online/tx/0x123',
    )
  })

  it('offers standard account activation before the private shield flow', async () => {
    const user = userEvent.setup()
    const activate = vi.fn().mockResolvedValue({ bidder: 'Bidder A', transactionHash: '0x456' })
    const sepoliaConnection = {
      ...connection,
      address: SEPOLIA_DEMO_BIDDER_CONFIG.bidderA,
      chainId: SEPOLIA_CHAIN_ID,
    }
    render(
      <DemoBidderSetupPanel
        connection={sepoliaConnection}
        config={SEPOLIA_DEMO_BIDDER_CONFIG}
        activate={activate}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Activate Bidder A' }))

    expect(activate).toHaveBeenCalledWith(sepoliaConnection, SEPOLIA_DEMO_BIDDER_CONFIG)
    expect(await screen.findByRole('status')).toHaveTextContent('Activation transaction submitted')
    expect(screen.getByRole('link', { name: /0x456/ })).toHaveAttribute(
      'href',
      'https://sepolia.voyager.online/tx/0x456',
    )
  })

  it('does not enable shielding without an approved bidder account', () => {
    const { rerender } = render(<DemoBidderSetupPanel connection={null} />)
    expect(screen.getByRole('button', { name: 'Connect Bidder A or Bidder B' })).toBeDisabled()

    rerender(
      <DemoBidderSetupPanel
        connection={{
          ...connection,
          address: MAINNET_DEPLOYER,
        }}
        config={MAINNET_DEMO_BIDDER_CONFIG}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('seller account cannot shield bidder funds')
    expect(screen.getByRole('button', { name: 'Connect Bidder A or Bidder B' })).toBeDisabled()
  })

  it('turns an unregistered viewing-key failure into the exact Ready X onboarding step', async () => {
    const user = userEvent.setup()
    const shield = vi.fn().mockRejectedValue(
      new Error('No viewing key available for account. Ensure the account is provisioned via the backend.'),
    )
    render(<DemoBidderSetupPanel connection={connection} config={MAINNET_DEMO_BIDDER_CONFIG} shield={shield} />)

    await user.click(screen.getByRole('button', { name: 'Shield 24 STRK for Bidder A' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ready X cannot enable private tokens for an imported account. Create a native Ready X Standard Account for this bidder.',
    )
  })
})
