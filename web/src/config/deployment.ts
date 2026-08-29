export const SEPOLIA_CHAIN_ID = '0x534e5f5345504f4c4941'
export const MAINNET_CHAIN_ID = '0x534e5f4d41494e'
export const SEPOLIA_STRK20_POOL = '0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91'
export const MAINNET_STRK20_POOL = '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a'
export const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

const CONTRACT_ADDRESS_BOUND = 1n << 251n
const STARK_FIELD_PRIME = (1n << 251n) + 17n * (1n << 192n) + 1n

export type DeploymentNetwork = 'sepolia' | 'mainnet'
export type DeploymentEnvironment = Readonly<Record<string, string | undefined>>

export type DeploymentManifest = Readonly<{
  network: DeploymentNetwork
  chainId: string
  rpcUrl: string
  auctionHouse: `0x${string}`
  auctionHouseClassHash: `0x${string}`
  strk20Pool: `0x${string}`
  paymentToken: `0x${string}`
}>

function required(environment: DeploymentEnvironment, key: string): string {
  const value = environment[key]?.trim()
  if (!value) throw new Error(`${key} is required`)
  return value
}

function parseFelt(value: string, key: string, exclusiveBound: bigint): `0x${string}` {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(`${key} must be a hexadecimal felt`)
  const parsed = BigInt(value)
  if (parsed <= 0n || parsed >= exclusiveBound) throw new Error(`${key} is outside the accepted felt range`)
  return `0x${parsed.toString(16)}`
}

function parseRpcUrl(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('NEXT_PUBLIC_STARKNET_RPC_URL must be an absolute HTTP(S) URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('NEXT_PUBLIC_STARKNET_RPC_URL must be an absolute HTTP(S) URL')
  }
  return value
}

export function loadDeploymentManifest(environment: DeploymentEnvironment): DeploymentManifest {
  const rawNetwork = required(environment, 'NEXT_PUBLIC_CIPHERBID_NETWORK')
  if (rawNetwork !== 'sepolia' && rawNetwork !== 'mainnet') {
    throw new Error(`Unsupported CipherBid network: ${rawNetwork}`)
  }

  const network: DeploymentNetwork = rawNetwork
  const chainId = network === 'sepolia' ? SEPOLIA_CHAIN_ID : MAINNET_CHAIN_ID
  const canonicalPool = network === 'sepolia' ? SEPOLIA_STRK20_POOL : MAINNET_STRK20_POOL
  const configuredPool = parseFelt(
    required(environment, 'NEXT_PUBLIC_STRK20_POOL_ADDRESS'),
    'NEXT_PUBLIC_STRK20_POOL_ADDRESS',
    CONTRACT_ADDRESS_BOUND,
  )
  const configuredToken = parseFelt(
    required(environment, 'NEXT_PUBLIC_STRK_TOKEN_ADDRESS'),
    'NEXT_PUBLIC_STRK_TOKEN_ADDRESS',
    CONTRACT_ADDRESS_BOUND,
  )

  if (BigInt(configuredPool) !== BigInt(canonicalPool)) {
    throw new Error(`STRK20 pool does not match canonical ${network} deployment`)
  }
  if (BigInt(configuredToken) !== BigInt(STRK_TOKEN)) {
    throw new Error('STRK token does not match canonical deployment')
  }

  return Object.freeze({
    network,
    chainId,
    rpcUrl: parseRpcUrl(required(environment, 'NEXT_PUBLIC_STARKNET_RPC_URL')),
    auctionHouse: parseFelt(
      required(environment, 'NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS'),
      'NEXT_PUBLIC_AUCTION_HOUSE_ADDRESS',
      CONTRACT_ADDRESS_BOUND,
    ),
    auctionHouseClassHash: parseFelt(
      required(environment, 'NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH'),
      'NEXT_PUBLIC_AUCTION_HOUSE_CLASS_HASH',
      STARK_FIELD_PRIME,
    ),
    strk20Pool: canonicalPool,
    paymentToken: STRK_TOKEN,
  })
}
