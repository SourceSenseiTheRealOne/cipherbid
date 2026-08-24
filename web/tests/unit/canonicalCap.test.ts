import { describe, expect, it, vi } from 'vitest'
import { readCanonicalCap } from '@/features/privacy/canonicalCap'

describe('readCanonicalCap', () => {
  it('reads the configured public cap from the Sepolia spike contract', async () => {
    const provider = {
      callContract: vi.fn().mockResolvedValue(['0x4563918244f40000']),
    }

    await expect(readCanonicalCap('0x222', provider)).resolves.toBe(5_000_000_000_000_000_000n)
    expect(provider.callContract).toHaveBeenCalledWith({
      contractAddress: '0x222',
      entrypoint: 'get_cap',
      calldata: [],
    })
  })

  it('rejects zero, malformed, and out-of-u128 cap responses', async () => {
    await expect(readCanonicalCap('0x222', { callContract: vi.fn().mockResolvedValue(['0x0']) })).rejects.toThrow(
      'Contract returned an invalid uniform cap',
    )
    await expect(readCanonicalCap('0x222', { callContract: vi.fn().mockResolvedValue([]) })).rejects.toThrow(
      'Contract returned an invalid uniform cap',
    )
    await expect(
      readCanonicalCap('0x222', { callContract: vi.fn().mockResolvedValue([(1n << 128n).toString()]) }),
    ).rejects.toThrow('Contract returned an invalid uniform cap')
  })
})
