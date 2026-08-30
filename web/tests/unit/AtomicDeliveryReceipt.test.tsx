import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AtomicDeliveryReceipt } from '@/features/auction/ui/AtomicDeliveryReceipt'

const settlement = {
  network: 'sepolia' as const,
  settled: true,
  sold: true,
  auctionId: '7',
  nftContract: '0x999',
  tokenId: '99',
  nftOwner: '0x888',
  winnerRecipient: '0x888',
  clearingPrice: '3000000000000000000',
  sellerEntitlement: '3000000000000000000',
  sellerClaimConsumed: false,
  custodyValid: true,
}

describe('AtomicDeliveryReceipt', () => {
  it('renders verified delivery facts and explorer-linked public receipts', () => {
    render(
      <AtomicDeliveryReceipt
        settlement={settlement}
        receipts={[
          { label: 'Settlement', transactionHash: '0xabc', finalityStatus: 'ACCEPTED_ON_L2', blockNumber: 77 },
          { label: 'Seller proceeds', transactionHash: '0xdef', finalityStatus: 'ACCEPTED_ON_L1', blockNumber: 78 },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Atomic Delivery Receipt' })).toBeInTheDocument()
    expect(screen.getByText('Delivery verified')).toBeInTheDocument()
    expect(screen.getByText('3 STRK')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Settlement 0xabc/i })).toHaveAttribute(
      'href',
      'https://sepolia.starkscan.co/tx/0xabc',
    )
    expect(screen.getByRole('link', { name: /Seller proceeds 0xdef/i })).toBeInTheDocument()
    expect(screen.getByText('Seller entitlement')).toBeInTheDocument()
    expect(screen.getByText('3 STRK remains claimable')).toBeInTheDocument()
  })

  it('never invents transaction hashes while settlement is pending', () => {
    render(<AtomicDeliveryReceipt settlement={{ ...settlement, settled: false, sold: false }} receipts={[]} />)
    expect(screen.getByText('Settlement pending')).toBeInTheDocument()
    expect(screen.getByText('No verified transaction receipts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
