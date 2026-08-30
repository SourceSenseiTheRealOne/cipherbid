import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CipherBid — Private Vickrey auctions on Starknet',
  description: 'A visual preview of STRK20-funded sealed NFT auction mechanics.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="cipherbid-root">{children}</body>
    </html>
  )
}
