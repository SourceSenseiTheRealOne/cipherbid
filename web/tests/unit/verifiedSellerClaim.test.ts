import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { verifiedReceiptsForAuction } from '@/config/verifiedMainnetLifecycle'

const sellerClaimHash = '0x24d92390b2f0ca629fe49e4c4355aaa2fe1fbf143bd4ba1e37b80e4575528e'

describe('verified seller claim publication', () => {
  it('publishes the qualifying seller claim once in the STRK20 manifest', () => {
    const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), '..', 'strk20.json'), 'utf8')) as {
      transactions: string[]
    }

    expect(manifest.transactions).toHaveLength(5)
    expect(new Set(manifest.transactions).size).toBe(5)
    expect(manifest.transactions.at(-1)).toBe(sellerClaimHash)
  })

  it('ends the canonical receipt ledger with seller authorization and private claim', () => {
    const receipts = verifiedReceiptsForAuction('mainnet', '1788040057342')

    expect(receipts).toHaveLength(10)
    expect(receipts.slice(-2)).toEqual([
      {
        label: 'Seller authorization',
        transactionHash: '0x51e1bb6d0fd7474f7213c744714eb7d2256701b12050763c5ed73ac92ebf933',
        finalityStatus: 'ACCEPTED_ON_L2',
        blockNumber: 14_141_273,
      },
      {
        label: 'Seller proceeds',
        transactionHash: sellerClaimHash,
        finalityStatus: 'ACCEPTED_ON_L2',
        blockNumber: 14_141_287,
      },
    ])
  })
})
