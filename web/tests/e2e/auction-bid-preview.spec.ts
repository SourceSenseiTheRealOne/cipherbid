import { expect, test } from '@playwright/test'

test('renders the live-chain home entry point without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Private bids. Guaranteed onchain delivery.' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Open an auction' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create an auction' })).toHaveAttribute('href', '/create')
  await expect(async () => {
    await page.getByLabel('Auction ID').fill('7')
    expect(await page.getByRole('link', { name: 'Open auction' }).getAttribute('href')).toBe('/auction?id=7')
  }).toPass()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0)
  expect(errors).toEqual([])
})

test('stacks the live-chain entry point at a true mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  expect(await page.evaluate(() => window.innerWidth)).toBe(390)
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox()
  const auctionPanel = await page.locator('#open-auction').boundingBox()
  expect(heading).not.toBeNull()
  expect(auctionPanel).not.toBeNull()
  expect(heading!.y).toBeLessThan(auctionPanel!.y)
  await expect(page.getByRole('link', { name: 'Open auction' })).toHaveCSS('min-height', '48px')

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
  await page.goto('/')

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

test('rejects hostile route IDs as inert text', async ({ page }) => {
  const payload = 'design-preview<script>alert(1)</script>'
  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.dismiss()
  })

  const response = await page.goto(`/auction?id=${encodeURIComponent(payload)}`)
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Live auction unavailable' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Auction ID must be a positive u64 decimal value.')
  await expect(page.locator('main')).toContainText(payload)
  await expect(page.locator('main script')).toHaveCount(0)
  expect(dialogs).toEqual([])

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'CipherBid' })).toBeFocused()
})
