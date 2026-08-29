import { expect, test } from '@playwright/test'

test('renders the deployment-bound seller route without requesting private wallet state', async ({ page }) => {
  const response = await page.goto('/create')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Create a private-bid NFT auction' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Connect a privacy-capable wallet' })).toBeVisible()
  await expect(page.getByText('No Starknet wallet detected. Install or unlock Ready, then refresh.')).toBeVisible()
  await expect(page.getByText(/encrypted recovery is downloaded and import-verified/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create auction with NFT custody' })).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
})

test('renders the verified bidder shield setup without reading private balances', async ({ page }) => {
  const response = await page.goto('/demo/setup')

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Shield both demo bidders before the timer starts' }),
  ).toBeVisible()
  await expect(page.getByText('Starknet Sepolia demo preparation')).toBeVisible()
  await expect(page.getByText('No Starknet wallet detected. Install or unlock Ready, then refresh.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Connect Bidder A or Bidder B' })).toBeDisabled()
  await expect(page.getByText(/never receives a viewing key/i)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
})
