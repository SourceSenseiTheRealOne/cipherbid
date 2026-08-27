import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuctionBidPreview } from '@/features/auction/ui/AuctionBidPreview'

const maliciousRouteId = 'design-preview<script>alert(1)</script>'

describe('AuctionBidPreview', () => {
  it('renders the route id as inert text, a real wallet connector, and no operational bid control', () => {
    render(<AuctionBidPreview auctionId={maliciousRouteId} />)

    expect(screen.getByRole('heading', { level: 1, name: 'A genuinely sealed NFT auction' })).toBeInTheDocument()
    expect(screen.getAllByText('Design preview')).not.toHaveLength(0)
    expect(screen.getByText(maliciousRouteId)).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByText('Auction')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Connect a privacy-capable wallet' })).toBeInTheDocument()
    expect(screen.getByTestId('wallet-connect-module')).toBeInTheDocument()
    expect(screen.getByText('No Starknet wallet detected. Install or unlock Ready, then refresh.')).toBeInTheDocument()
    expect(screen.getByLabelText('Bid amount')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bidding unavailable in design preview' })).toBeDisabled()
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
    expect(screen.getByText('0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'NFT lot' })).toBeInTheDocument()
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
    expect(within(privacy).getByText(/bidder-to-action link/i)).toBeInTheDocument()
    expect(within(privacy).queryByText(/which shielded note/i)).not.toBeInTheDocument()
    expect(within(privacy).getByText(/deposits, withdrawals, timing/i)).toBeInTheDocument()
  })

  it('includes an explicitly illustrative second-price clearing chart', () => {
    render(<AuctionBidPreview auctionId="design-preview" />)

    expect(screen.getByRole('img', { name: 'Illustrative second-price clearing chart' })).toBeInTheDocument()
    expect(screen.getByText('Illustration — not chain data')).toBeInTheDocument()
    expect(screen.getByText('Winning bid')).toBeInTheDocument()
    expect(screen.getByText('Second price')).toBeInTheDocument()
  })

  it('renders a qualitative protocol console without inventing chain data', () => {
    render(<AuctionBidPreview auctionId="design-preview" />)

    const protocolConsole = screen.getByRole('region', { name: 'Protocol state' })
    expect(within(protocolConsole).getByText('Uniform cap collateral')).toBeInTheDocument()
    expect(within(protocolConsole).getByText('Second-price settlement')).toBeInTheDocument()
    expect(within(protocolConsole).getByText('Design preview')).toBeInTheDocument()
    expect(within(protocolConsole).queryByText(/\d+\.?\d* STRK/)).not.toBeInTheDocument()
  })
})
