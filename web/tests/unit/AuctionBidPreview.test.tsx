import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuctionBidPreview } from '@/features/auction/ui/AuctionBidPreview'

const maliciousRouteId = 'design-preview<script>alert(1)</script>'

describe('AuctionBidPreview', () => {
  it('renders the route id as inert text and exposes no operational bid control', () => {
    render(<AuctionBidPreview auctionId={maliciousRouteId} />)

    expect(screen.getByRole('heading', { level: 1, name: 'A genuinely sealed NFT auction' })).toBeInTheDocument()
    expect(screen.getByText('Design preview')).toBeInTheDocument()
    expect(screen.getByText(maliciousRouteId)).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByLabelText('Bid amount')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bidding unavailable in design preview' })).toBeDisabled()
    expect(screen.queryByText(/connect wallet/i)).not.toBeInTheDocument()
  })

  it('uses truthful placeholders instead of invented onchain auction data', () => {
    render(<AuctionBidPreview auctionId="design-preview" />)

    const facts = screen.getByRole('region', { name: 'Auction facts' })
    for (const label of ['Reserve', 'Uniform collateral cap', 'Bid deadline', 'Reveal window']) {
      const row = within(facts).getByTestId(`fact-${label.toLowerCase().replaceAll(' ', '-')}`)
      expect(within(row).getByText(label)).toBeInTheDocument()
      expect(within(row).getByText('—')).toBeInTheDocument()
    }

    expect(screen.getAllByText('Awaiting chain data').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Awaiting deployment')).toBeInTheDocument()
  })

  it('explains the Vickrey lifecycle and privacy boundary honestly', () => {
    render(<AuctionBidPreview auctionId="design-preview" />)

    expect(screen.getByText('Lock equal collateral')).toBeInTheDocument()
    expect(screen.getByText('Reveal the committed amount')).toBeInTheDocument()
    expect(screen.getByText('Highest bidder pays second price')).toBeInTheDocument()

    const privacy = screen.getByRole('region', { name: 'Private and public auction data' })
    expect(privacy).toHaveAttribute('id', 'privacy')
    expect(within(privacy).getByText('Private before reveal')).toBeInTheDocument()
    expect(within(privacy).getByText('Public by design')).toBeInTheDocument()
    expect(within(privacy).getByText(/deposits, withdrawals, timing/i)).toBeInTheDocument()
  })
})
