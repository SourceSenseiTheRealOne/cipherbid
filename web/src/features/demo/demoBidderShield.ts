import type { WALLET_API } from '@starknet-io/types-js'
import type { PrivacyWalletConnection } from '@/features/wallet/walletConnection'
import { MAINNET_CHAIN_ID, SEPOLIA_CHAIN_ID, STRK_TOKEN, type DeploymentNetwork } from '@/config/deployment'
import { MAINNET_BIDDER_A, MAINNET_BIDDER_B } from '@/config/mainnetRelease'

const SEPOLIA_BIDDER_A = '0x054499e46751979eea7fcc64475836d1a5f591c2d12a7546e42e8516fdbabc4d' as const
const SEPOLIA_BIDDER_B = '0x014ecc190504847edc0b29f427404b2cad833ff8837277af69f4d3bf99d82b52' as const

type DemoBidder = 'Bidder A' | 'Bidder B'
export type DemoBidderConfig = Readonly<{
  network: DeploymentNetwork
  chainId: string
  networkLabel: string
  bidderA: `0x${string}`
  bidderB: `0x${string}`
  paymentToken: `0x${string}`
  shieldAmount: `0x${string}`
  shieldDisplay: string
  allowActivation: boolean
  explorerTransactionBase: string
}>

export const MAINNET_DEMO_BIDDER_CONFIG: DemoBidderConfig = Object.freeze({
  network: 'mainnet',
  chainId: MAINNET_CHAIN_ID,
  networkLabel: 'Starknet mainnet',
  bidderA: MAINNET_BIDDER_A,
  bidderB: MAINNET_BIDDER_B,
  paymentToken: STRK_TOKEN,
  shieldAmount: '0x14d1120d7b1600000',
  shieldDisplay: '24',
  allowActivation: false,
  explorerTransactionBase: 'https://voyager.online/tx',
})

export const SEPOLIA_DEMO_BIDDER_CONFIG: DemoBidderConfig = Object.freeze({
  network: 'sepolia',
  chainId: SEPOLIA_CHAIN_ID,
  networkLabel: 'Starknet Sepolia',
  bidderA: SEPOLIA_BIDDER_A,
  bidderB: SEPOLIA_BIDDER_B,
  paymentToken: STRK_TOKEN,
  shieldAmount: '0xd02ab486cedc0000',
  shieldDisplay: '15',
  allowActivation: true,
  explorerTransactionBase: 'https://sepolia.voyager.online/tx',
})

export function demoBidderConfig(network: DeploymentNetwork): DemoBidderConfig {
  return network === 'mainnet' ? MAINNET_DEMO_BIDDER_CONFIG : SEPOLIA_DEMO_BIDDER_CONFIG
}
type ShieldWallet = Readonly<{
  strk20InvokeTransaction: (actions: readonly WALLET_API.STRK20_ACTION[]) => Promise<unknown>
}>
type ActivationWallet = Readonly<{
  execute: (call: Readonly<{ contractAddress: string; entrypoint: string; calldata: readonly string[] }>) => Promise<unknown>
}>

function sameFelt(left: string, right: string): boolean {
  try {
    return BigInt(left) === BigInt(right)
  } catch {
    return false
  }
}

export function demoBidderForAddress(
  address: string,
  config: DemoBidderConfig = MAINNET_DEMO_BIDDER_CONFIG,
): DemoBidder | null {
  if (sameFelt(address, config.bidderA)) return 'Bidder A'
  if (sameFelt(address, config.bidderB)) return 'Bidder B'
  return null
}

export function publicDemoShieldError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (
    message.includes('no viewing key') ||
    message.includes('provisioned via the backend') ||
    message.includes('not_registered') ||
    message.includes('not registered')
  ) {
    return 'Ready X cannot enable private tokens for an imported account. Create a native Ready X Standard Account for this bidder.'
  }
  if (message.includes('user_refused') || message.includes('rejected') || message.includes('cancelled')) {
    return 'The Ready X request was rejected or cancelled. No transaction was submitted.'
  }
  return 'Ready X could not prepare the shield transaction. No transaction was submitted.'
}

function shieldWallet(account: unknown): ShieldWallet {
  if (
    typeof account !== 'object' ||
    account === null ||
    !('strk20InvokeTransaction' in account) ||
    typeof account.strk20InvokeTransaction !== 'function'
  ) {
    throw new Error('Connected wallet does not expose the STRK20 Wallet API')
  }
  return account as ShieldWallet
}

function activationWallet(account: unknown): ActivationWallet {
  if (typeof account !== 'object' || account === null || !('execute' in account) || typeof account.execute !== 'function') {
    throw new Error('Connected wallet does not expose standard Starknet execution')
  }
  return account as ActivationWallet
}

function responseHash(response: unknown): string {
  if (typeof response !== 'object' || response === null) throw new Error('Wallet returned no transaction hash')
  const record = response as Record<string, unknown>
  const value = record.transaction_hash ?? record.transactionHash
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error('Wallet returned no transaction hash')
  }
  return value
}

function normalizedChainId(chainId: string): string {
  if (chainId === 'SN_SEPOLIA') return SEPOLIA_CHAIN_ID
  if (chainId === 'SN_MAIN') return MAINNET_CHAIN_ID
  return chainId
}

function connectedBidder(connection: PrivacyWalletConnection, config: DemoBidderConfig): DemoBidder {
  if (!sameFelt(normalizedChainId(connection.chainId), config.chainId)) {
    throw new Error(`Switch Ready X to ${config.networkLabel}`)
  }
  const bidder = demoBidderForAddress(connection.address, config)
  if (!bidder) throw new Error('Connect bidder A or bidder B; the seller account cannot shield bidder funds')
  return bidder
}

export async function runDemoBidderActivation(
  connection: PrivacyWalletConnection,
  config: DemoBidderConfig = MAINNET_DEMO_BIDDER_CONFIG,
): Promise<Readonly<{ bidder: DemoBidder; transactionHash: string }>> {
  const bidder = connectedBidder(connection, config)
  const response = await activationWallet(connection.account).execute({
    contractAddress: config.paymentToken,
    entrypoint: 'transfer',
    calldata: [connection.address, '0x38d7ea4c68000', '0x0'],
  })
  return Object.freeze({ bidder, transactionHash: responseHash(response) })
}

export async function runDemoBidderShield(
  connection: PrivacyWalletConnection,
  config: DemoBidderConfig = MAINNET_DEMO_BIDDER_CONFIG,
): Promise<Readonly<{ bidder: DemoBidder; transactionHash: string }>> {
  const bidder = connectedBidder(connection, config)
  if (!connection.supportsStrk20) throw new Error('Wallet API 0.10.3 or newer is required')
  const actions: readonly WALLET_API.STRK20_ACTION[] = Object.freeze([
    Object.freeze({ type: 'deposit', token: config.paymentToken, amount: config.shieldAmount }),
  ])
  const response = await shieldWallet(connection.account).strk20InvokeTransaction(actions)
  return Object.freeze({ bidder, transactionHash: responseHash(response) })
}
