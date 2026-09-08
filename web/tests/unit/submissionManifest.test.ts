import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(process.cwd(), '..')
const videoUrl = 'https://youtu.be/pYZk6KXko7o'

describe('final STRK20 submission manifest', () => {
  it('binds verified contracts, transactions, demo, and a real public video asset', () => {
    const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'strk20.json'), 'utf8')) as {
      transactions: string[]
      contracts: string[]
      demo_url: string
      demo_video: string
    }
    const videoPath = path.resolve(process.cwd(), 'public', 'cipherbid-mainnet-demo.mp4')

    expect(manifest.transactions).toHaveLength(5)
    expect(new Set(manifest.transactions).size).toBe(5)
    expect(manifest.transactions.every((value) => /^0x[0-9a-f]+$/.test(value))).toBe(true)
    expect(manifest.contracts).toHaveLength(2)
    expect(manifest.demo_url).toBe(
      'https://sourcesenseitherealone.github.io/cipherbid/auction/?id=1788040057342',
    )
    expect(manifest.demo_video).toBe(videoUrl)
    expect(existsSync(videoPath)).toBe(true)
    expect(statSync(videoPath).size).toBeGreaterThan(1_000_000)
    expect(statSync(videoPath).size).toBeLessThan(25_000_000)
    expect(readFileSync(videoPath).subarray(4, 8).toString('ascii')).toBe('ftyp')
  })
})
