import { expect, test } from '@playwright/test'

const route = '/auctions/design-preview'

test('renders the desktop auction bid preview without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto(route)

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'A genuinely sealed NFT auction' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Connect a privacy-capable wallet' })).toBeVisible()
  await expect(page.getByText('No Starknet wallet detected. Install or unlock Ready, then refresh.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bidding unavailable in design preview' })).toBeDisabled()
  await expect(page.getByTestId('protocol-console')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Protocol state' })).toContainText('Uniform cap collateral')
  await expect(page.getByRole('region', { name: 'Protocol state' })).toContainText('Contract deployment pending')
  await expect(page.getByText('0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91')).toBeVisible()

  const bidCard = page.getByTestId('bid-preview-card')
  await expect(bidCard).toHaveCSS('position', 'sticky')
  const initialBidBox = await bidCard.boundingBox()
  await page.evaluate(() => window.scrollTo(0, 1200))
  await expect.poll(async () => (await bidCard.boundingBox())?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(40)
  expect(initialBidBox?.y ?? 0).toBeGreaterThan(40)
  await expect(page.locator('.cipherbid-auction-art')).toHaveCSS('background-image', /radial-gradient/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  expect(errors).toEqual([])
})

test('stacks the lot, bid card, and facts at a true mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(route)

  expect(await page.evaluate(() => window.innerWidth)).toBe(390)
  const lot = await page.getByTestId('auction-lot').boundingBox()
  const protocolConsole = await page.getByTestId('protocol-console').boundingBox()
  const bid = await page.getByTestId('bid-preview-card').boundingBox()
  const facts = await page.getByRole('region', { name: 'Auction facts' }).boundingBox()

  expect(lot).not.toBeNull()
  expect(protocolConsole).not.toBeNull()
  expect(bid).not.toBeNull()
  expect(facts).not.toBeNull()
  await expect(page.getByTestId('bid-preview-card')).toHaveCSS('position', 'static')
  expect(lot!.y).toBeLessThan(bid!.y)
  expect(lot!.y).toBeLessThan(protocolConsole!.y)
  expect(protocolConsole!.y).toBeLessThan(bid!.y)
  expect(bid!.y).toBeLessThan(facts!.y)
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    return [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => {
        const box = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          className: element.className.toString().slice(0, 100),
          overflow: Math.max(0, Math.ceil(box.right - viewportWidth)),
        }
      })
      .filter((element) => element.overflow > 0)
      .slice(0, 10)
  })
  expect(overflow).toEqual([])
})

test('removes decorative transitions in reduced-motion mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route)

  const movingElements = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.cipherbid-auction-page *')]
      .map((element) => {
        const style = getComputedStyle(element)
        return {
          tag: element.tagName,
          transition: style.transitionDuration,
          animation: style.animationName,
        }
      })
      .filter((element) => element.transition !== '0s' || element.animation !== 'none'),
  )
  expect(movingElements).toEqual([])
})

test('keeps keyboard order logical and route ids inert', async ({ page }) => {
  const payload = 'design-preview<script>alert(1)</script>'
  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.dismiss()
  })

  await page.goto(`/auctions/${encodeURIComponent(payload)}`)
  await expect(page.locator('main code')).toHaveText(payload)
  await expect(page.locator('main script')).toHaveCount(0)
  expect(dialogs).toEqual([])

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'CipherBid' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'How privacy works' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Auctions' })).toBeFocused()
})
