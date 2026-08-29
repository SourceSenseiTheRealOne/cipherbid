import { describe, expect, it, vi } from 'vitest'
import {
  MAINNET_DEMO_BIDDER_CONFIG,
  SEPOLIA_DEMO_BIDDER_CONFIG,
  demoBidderForAddress,
  runDemoBidderActivation,
  runDemoBidderShield,
} from '@/features/demo/demoBidderShield'
import { MAINNET_BIDDER_A, MAINNET_BIDDER_B, MAINNET_DEPLOYER } from '@/config/mainnetRelease'
import { MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID, STRK_TOKEN } from '@/config/deployment'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'

function connection(address: `0x${string}`, invoke = vi.fn().mockResolvedValue({ transaction_hash: '0x123' })) {
  return {
    account: { strk20InvokeTransaction: invoke },
    address,
    chainId: MAINNET_CHAIN_ID,
    walletApiVersions: ['0.10.3'],
    supportsStrk20: true,
  } satisfies PrivacyWalletConnection
}

describe('demo bidder shield flow', () => {
  it('maps only the approved mainnet Ready accounts to demo bidder roles', () => {
    expect(demoBidderForAddress(MAINNET_BIDDER_A, MAINNET_DEMO_BIDDER_CONFIG)).toBe('Bidder A')
    expect(demoBidderForAddress(MAINNET_BIDDER_B, MAINNET_DEMO_BIDDER_CONFIG)).toBe('Bidder B')
    expect(
      demoBidderForAddress(
        '0x054499e46751979eea7fcc64475836d1a5f591c2d12a7546e42e8516fdbabc4d',
        MAINNET_DEMO_BIDDER_CONFIG,
      ),
    ).toBeNull()
  })

  it('activates a native Ready bidder through a 0.001 STRK self-transfer', async () => {
    const execute = vi.fn().mockResolvedValue({ transaction_hash: '0x456' })
    const walletConnection = {
      ...connection(SEPOLIA_DEMO_BIDDER_CONFIG.bidderA),
      chainId: SEPOLIA_CHAIN_ID,
      account: { execute, strk20InvokeTransaction: vi.fn() },
    }

    await expect(runDemoBidderActivation(walletConnection, SEPOLIA_DEMO_BIDDER_CONFIG)).resolves.toEqual({
      bidder: 'Bidder A',
      transactionHash: '0x456',
    })
    expect(execute).toHaveBeenCalledWith({
      contractAddress: STRK_TOKEN,
      entrypoint: 'transfer',
      calldata: [SEPOLIA_DEMO_BIDDER_CONFIG.bidderA, '0x38d7ea4c68000', '0x0'],
    })
  })

  it('asks Ready to shield exactly 24 STRK for mainnet bidder A', async () => {
    const invoke = vi.fn().mockResolvedValue({ transaction_hash: '0x123' })

    const result = await runDemoBidderShield(connection(MAINNET_BIDDER_A, invoke), MAINNET_DEMO_BIDDER_CONFIG)

    expect(invoke).toHaveBeenCalledWith([{ type: 'deposit', token: STRK_TOKEN, amount: '0x14d1120d7b1600000' }])
    expect(result).toEqual({ bidder: 'Bidder A', transactionHash: '0x123' })
  })

  it('accepts bidder B but rejects seller and malformed wallet responses before claiming success', async () => {
    await expect(runDemoBidderShield(connection(MAINNET_BIDDER_B), MAINNET_DEMO_BIDDER_CONFIG)).resolves.toEqual({
      bidder: 'Bidder B',
      transactionHash: '0x123',
    })

    const sellerInvoke = vi.fn()
    await expect(
      runDemoBidderShield(connection(MAINNET_DEPLOYER, sellerInvoke), MAINNET_DEMO_BIDDER_CONFIG),
    ).rejects.toThrow('bidder A or bidder B')
    expect(sellerInvoke).not.toHaveBeenCalled()

    await expect(
      runDemoBidderShield(connection(MAINNET_BIDDER_A, vi.fn().mockResolvedValue({})), MAINNET_DEMO_BIDDER_CONFIG),
    ).rejects.toThrow('transaction hash')
  })

  it('rejects the wrong chain or a wallet without STRK20 support', async () => {
    await expect(
      runDemoBidderShield({ ...connection(MAINNET_BIDDER_A), chainId: SEPOLIA_CHAIN_ID }, MAINNET_DEMO_BIDDER_CONFIG),
    ).rejects.toThrow('mainnet')
    await expect(
      runDemoBidderShield({ ...connection(MAINNET_BIDDER_A), supportsStrk20: false }, MAINNET_DEMO_BIDDER_CONFIG),
    ).rejects.toThrow('Wallet API')
  })
})
