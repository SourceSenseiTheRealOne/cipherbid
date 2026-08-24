import { RpcProvider } from 'starknet'

export const SEPOLIA_CHAIN_ID = '0x534e5f5345504f4c4941'
export const SEPOLIA_RPC_URL = 'https://starknet-sepolia-rpc.publicnode.com'
export const SEPOLIA_STRK20_POOL = '0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91'
export const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

export function isSepoliaChainId(chainId: string): boolean {
  return chainId === SEPOLIA_CHAIN_ID || chainId === 'SN_SEPOLIA'
}

export function createSepoliaProvider(): RpcProvider {
  return new RpcProvider({ nodeUrl: SEPOLIA_RPC_URL })
}
