import { expect, test } from '@playwright/test'

test('renders the Sepolia feasibility gate without requesting private wallet state', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'CipherBid feasibility gate' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Connect a privacy-capable wallet' })).toBeVisible()
  await expect(page.getByText('No Starknet wallet detected. Install or unlock Ready, then refresh.')).toBeVisible()
  await expect(page.getByText(/viewing keys, shielded balances, and raw wallet errors never enter/)).toBeVisible()
})
