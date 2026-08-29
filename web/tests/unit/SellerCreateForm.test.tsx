import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SellerCreateForm, type SellerCreateDeployment } from '@/features/auction/ui/SellerCreateForm'

const deployment: SellerCreateDeployment = {
  network: 'sepolia',
  chainId: '0x534e5f5345504f4c4941',
  rpcUrl: 'https://rpc.example/sepolia',
  auctionHouse: '0x123',
  auctionHouseClassHash: '0x321',
  strk20Pool: '0x456',
  paymentToken: '0x654',
}

const connection = {
  account: { execute: vi.fn() },
  address: '0x777' as const,
  chainId: deployment.chainId,
  walletApiVersions: ['0.10.3'],
  supportsStrk20: true,
}

describe('SellerCreateForm', () => {
  it('keeps creation disabled until a compatible wallet connects', () => {
    render(<SellerCreateForm deployment={deployment} connection={null} />)
    expect(screen.getByLabelText('NFT contract address')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Create auction with NFT custody' })).toBeDisabled()
    expect(screen.getByText('Connect a compatible wallet to create an auction.')).toBeInTheDocument()
  })

  it('renders all immutable terms and encrypted recovery controls for the seller', () => {
    render(<SellerCreateForm deployment={deployment} connection={connection} />)
    for (const label of [
      'Auction ID',
      'NFT contract address',
      'NFT token ID',
      'Reserve price',
      'Uniform collateral cap',
      'Bidding deadline',
      'Reveal deadline',
      'Bidder limit',
      'Recovery password',
    ]) {
      expect(screen.getByLabelText(label)).toBeEnabled()
    }
    expect(screen.getByRole('button', { name: 'Create auction with NFT custody' })).toBeEnabled()
    expect(screen.getByText(/encrypted recovery is downloaded and import-verified before/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('claimSecret')
  })
})
