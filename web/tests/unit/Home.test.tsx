import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from '@/app/page'

describe('feasibility page', () => {
  it('mounts the real Sepolia wallet picker', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { level: 1, name: 'CipherBid feasibility gate' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Connect a privacy-capable wallet' })).toBeInTheDocument()
  })
})
