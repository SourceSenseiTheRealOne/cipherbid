import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from '@/app/page'

describe('CipherBid home', () => {
  it('presents the shipped product routes without mock auction data', () => {
    render(<Home />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Private bids. Guaranteed onchain delivery.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an auction' })).toHaveAttribute('href', '/create')
    expect(screen.getByLabelText('Auction ID')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open auction' })).toHaveAttribute('href', '/auctions/1')
    expect(screen.queryByText(/feasibility gate/i)).not.toBeInTheDocument()
  })
})
