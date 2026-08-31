import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const sourceFiles = [
  'src/app/globals.css',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/features/auction/ui/SellerCreatePage.tsx',
  'src/features/auction/ui/SellerCreateForm.tsx',
  'src/features/demo/ui/DemoBidderSetupPage.tsx',
  'src/features/wallet/WalletConnectPanel.tsx',
  'src/features/auction/ui/AtomicDeliveryReceipt.tsx',
  'src/features/auction/ui/AuctionBidPreview.tsx',
  'src/features/auction/ui/ProtocolConsole.tsx',
  'src/features/auction/ui/SecondPriceIllustration.tsx',
] as const

const source = (relativePath: (typeof sourceFiles)[number]) =>
  readFileSync(path.join(projectRoot, relativePath), 'utf8')

describe('CipherBid Taste visual system', () => {
  it('defines one shared industrial shell and component vocabulary', () => {
    const css = source('src/app/globals.css')
    const layout = source('src/app/layout.tsx')

    expect(css).toContain('--cb-accent:')
    expect(css).toContain('.cipherbid-root')
    expect(css).toContain('.cb-panel')
    expect(css).toContain('.cb-control')
    expect(css).toContain('.cb-primary')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(layout).toContain('className="cipherbid-root"')
  })

  it('allows live auction grid columns to shrink around scrollable evidence', () => {
    const css = source('src/app/globals.css')

    expect(css).toMatch(
      /\.cipherbid-auction-page \[class\*='lg:col-span-7'\],\s*\.cipherbid-auction-page \[class\*='lg:col-span-5'\] \{\s*min-width: 0;/,
    )
  })

  it('wraps long onchain owner addresses inside their fact card', () => {
    const css = source('src/app/globals.css')

    expect(css).toMatch(
      /\.cipherbid-auction-page dd > code \{[^}]*overflow-wrap: anywhere;[^}]*word-break: break-all;/s,
    )
  })

  it('removes the old purple design literals from the redesigned surface', () => {
    for (const relativePath of sourceFiles.filter((value) => value !== 'src/app/globals.css')) {
      expect(source(relativePath), relativePath).not.toMatch(/#6654d9|#7170ff|#a8b1ff/i)
    }
  })

  it('keeps product authority files outside the design allowlist', () => {
    expect(sourceFiles).not.toContain('src/features/transactions/auctionTransactionFlows.ts')
    expect(sourceFiles).not.toContain('src/features/wallet/walletConnection.ts')
    expect(sourceFiles).not.toContain('src/features/credentials/recoveryBundle.ts')
    expect(sourceFiles).not.toContain('src/config/deployment.ts')
  })
})
