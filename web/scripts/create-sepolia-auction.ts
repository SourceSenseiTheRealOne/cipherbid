import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { hash, RpcProvider } from 'starknet'
import { buildAuctionCreationPlan } from '@/features/auction/auctionCreationPlan'
import {
  evaluateDemoBidderReadiness,
  type DemoBidderStatus,
  type PublicDeposit,
} from '@/features/auction/demoBidderReadiness'
import { readAuctionSnapshot, type ChainReader } from '@/features/auction/auctionReader'
import { generateSellerCredential } from '@/features/credentials/credentials'
import { createVerifiedRecoveryBundle } from '@/features/credentials/recoveryBundle'
import { SEPOLIA_DEMO_BIDDER_CONFIG } from '@/features/demo/demoBidderShield'
import type { DeploymentManifest } from '@/config/deployment'

const AUCTION_HOUSE = '0x0705b1080174f2b10c02fd8b2e00b918e4dc91f9021ee6a208f53d5909fcc87d' as const
const AUCTION_HOUSE_CLASS = '0x06aa99b7ae9e10619b5a3c1713a4d71054844d3dda8e21bef98db6e653d5efc4' as const
const DEMO_NFT_CLASS = '0x06c7cba5680595203f9327f5784130907bad1b808891122ad358c10b93136a41' as const
const DEPLOYER = '0x01ff477da49d13f1b48774d0fc2313358e3f358be741b4944b54fccb34f7f424' as const
const POOL = '0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91' as const
const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d' as const
const CHAIN_ID = '0x534e5f5345504f4c4941'
const RPC_URL = 'https://api.zan.top/public/starknet-sepolia/rpc/v0_10'
const ACCOUNT = 'cipherbid-sepolia-deployer'
const ACCOUNT_FILE = '/home/sourcesensei/.starknet_accounts/starknet_open_zeppelin_accounts.json'
const BIDDER_ACCOUNTS = Object.freeze([
  {
    name: 'xverse-bidder-a',
    address: SEPOLIA_DEMO_BIDDER_CONFIG.bidderA,
    suggestedBid: '3 STRK',
  },
  {
    name: 'xverse-bidder-b',
    address: SEPOLIA_DEMO_BIDDER_CONFIG.bidderB,
    suggestedBid: '4 STRK',
  },
])
const BIDDER_DEPLOYMENT_BLOCK_FLOOR = 14_179_255
const DEPOSIT_SELECTOR = hash.getSelectorFromName('Deposit')
const TOKEN_ID = 99n
const TIP = 1_000_000_000n
const MAX_TRANSACTION_FEE = 2n * 10n ** 18n

const deployment: DeploymentManifest = {
  network: 'sepolia',
  chainId: CHAIN_ID,
  rpcUrl: RPC_URL,
  auctionHouse: AUCTION_HOUSE,
  auctionHouseClassHash: AUCTION_HOUSE_CLASS,
  strk20Pool: POOL,
  paymentToken: STRK,
}

type Options = Readonly<{
  auctionId: bigint
  reserve: string
  cap: string
  biddingMinutes: number
  revealMinutes: number
  bidderLimit: number
  nftAddress?: `0x${string}`
  planOnly: boolean
  preflightOnly: boolean
}>

type GasBounds = Readonly<{
  l1Gas: bigint
  l1GasPrice: bigint
  l2Gas: bigint
  l2GasPrice: bigint
  l1DataGas: bigint
  l1DataGasPrice: bigint
}>

function optionValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name)
  if (index < 0) return undefined
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

function integerOption(argv: readonly string[], name: string, fallback: number): number {
  const raw = optionValue(argv, name)
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be an integer`)
  return value
}

function parseOptions(argv: readonly string[]): Options {
  const now = Date.now()
  const auctionId = BigInt(optionValue(argv, '--auction-id') ?? now.toString())
  const nftAddress = optionValue(argv, '--nft-address')
  if (nftAddress && !/^0x[0-9a-fA-F]+$/.test(nftAddress)) throw new Error('--nft-address must be hexadecimal')
  return {
    auctionId,
    reserve: optionValue(argv, '--reserve') ?? '2',
    cap: optionValue(argv, '--cap') ?? '5',
    biddingMinutes: integerOption(argv, '--bidding-minutes', 10),
    revealMinutes: integerOption(argv, '--reveal-minutes', 5),
    bidderLimit: integerOption(argv, '--bidder-limit', 2),
    nftAddress: nftAddress as `0x${string}` | undefined,
    planOnly: argv.includes('--plan-only'),
    preflightOnly: argv.includes('--preflight-only'),
  }
}

function windowsToWsl(value: string): string {
  const normalized = path.resolve(value)
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(normalized)
  if (!match) throw new Error(`Cannot convert path to WSL: ${normalized}`)
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`
}

const contractsDirectory = windowsToWsl(path.resolve(process.cwd(), '..', 'contracts'))

function sncast(args: readonly string[]): string {
  const common = ['sncast', '--account', ACCOUNT, '--accounts-file', ACCOUNT_FILE]
  const command = `cd ${shellQuote(contractsDirectory)} && ${[...common, ...args].map(shellQuote).join(' ')}`
  const result = spawnSync('wsl.exe', ['-d', 'Ubuntu-24.04', '--', 'bash', '-lc', command], {
    encoding: 'utf8',
    windowsHide: true,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0) throw new Error(`Sncast failed (${result.status ?? 'unknown'}):\n${output}`)
  return output
}

function parsedValue(output: string, label: string): bigint {
  const match = new RegExp(`${label}:\\s*(\\d+)`).exec(output)
  if (!match) throw new Error(`Could not parse ${label} from Sncast dry run`)
  return BigInt(match[1])
}

function bufferedBounds(output: string): GasBounds {
  const buffer = (value: bigint, numerator: bigint, denominator: bigint) =>
    value === 0n ? 0n : (value * numerator + denominator - 1n) / denominator
  const bounds = {
    l1Gas: buffer(parsedValue(output, 'L1 Gas Consumed'), 13n, 10n),
    l1GasPrice: buffer(parsedValue(output, 'L1 Gas Price'), 3n, 2n),
    l2Gas: buffer(parsedValue(output, 'L2 Gas Consumed'), 13n, 10n),
    l2GasPrice: buffer(parsedValue(output, 'L2 Gas Price'), 3n, 2n),
    l1DataGas: buffer(parsedValue(output, 'L1 Data Gas Consumed'), 13n, 10n),
    l1DataGasPrice: buffer(parsedValue(output, 'L1 Data Gas Price'), 3n, 2n),
  }
  const ceiling =
    bounds.l1Gas * bounds.l1GasPrice +
    bounds.l2Gas * bounds.l2GasPrice +
    bounds.l1DataGas * bounds.l1DataGasPrice
  if (ceiling > MAX_TRANSACTION_FEE) {
    throw new Error(`Buffered transaction ceiling ${ceiling} Fri exceeds the 2 STRK demo limit`)
  }
  return bounds
}

function boundArgs(bounds: GasBounds): string[] {
  return [
    '--l1-gas',
    bounds.l1Gas.toString(),
    '--l1-gas-price',
    bounds.l1GasPrice.toString(),
    '--l2-gas',
    bounds.l2Gas.toString(),
    '--l2-gas-price',
    bounds.l2GasPrice.toString(),
    '--l1-data-gas',
    bounds.l1DataGas.toString(),
    '--l1-data-gas-price',
    bounds.l1DataGasPrice.toString(),
    '--tip',
    TIP.toString(),
  ]
}

function nonce(): bigint {
  const output = sncast(['get', 'nonce', '--network', 'sepolia', DEPLOYER, '--block-id', 'latest'])
  const match = /Nonce:\s*(\d+)/.exec(output)
  if (!match) throw new Error('Could not read deployer nonce')
  return BigInt(match[1])
}

function transactionHash(output: string): `0x${string}` {
  const match = /Transaction Hash:\s*(0x[0-9a-fA-F]+)/i.exec(output)
  if (!match) throw new Error('Sncast returned no transaction hash')
  return match[1].toLowerCase() as `0x${string}`
}

function callValues(value: readonly string[] | Readonly<{ result: readonly string[] }>): readonly string[] {
  return 'result' in value ? value.result : value
}

async function publicDeposits(
  provider: RpcProvider,
  bidderAddress: `0x${string}`,
): Promise<readonly PublicDeposit[]> {
  const deposits: PublicDeposit[] = []
  let continuationToken: string | undefined
  do {
    const page = await provider.getEvents({
      from_block: { block_number: BIDDER_DEPLOYMENT_BLOCK_FLOOR },
      to_block: 'latest',
      address: POOL,
      keys: [[DEPOSIT_SELECTOR], [bidderAddress], [STRK]],
      chunk_size: 100,
      ...(continuationToken ? { continuation_token: continuationToken } : {}),
    })
    for (const event of page.events) {
      if (event.block_number === undefined || event.data[0] === undefined) {
        throw new Error('STRK20 deposit event is missing accepted block or amount data')
      }
      deposits.push(
        Object.freeze({
          amount: BigInt(event.data[0]),
          blockNumber: event.block_number,
          transactionHash: event.transaction_hash as `0x${string}`,
        }),
      )
    }
    continuationToken = page.continuation_token
  } while (continuationToken)
  return Object.freeze(deposits)
}

function printableStatus(status: DemoBidderStatus) {
  return {
    ...status,
    depositAmount: status.depositAmount?.toString(),
    privateBalanceVerified: false,
  }
}

async function requirePublicBidderReadiness(provider: RpcProvider): Promise<void> {
  const latestBlock = await provider.getBlockNumber()
  const bidders = await Promise.all(
    BIDDER_ACCOUNTS.map(async (bidder) => {
      const response = await provider.callContract({
        contractAddress: POOL,
        entrypoint: 'get_public_key',
        calldata: [bidder.address],
      })
      const [publicKey] = callValues(response)
      if (!publicKey) throw new Error(`STRK20 returned no public key for ${bidder.name}`)
      return {
        ...bidder,
        publicKey: publicKey as `0x${string}`,
        deposits: await publicDeposits(provider, bidder.address),
      }
    }),
  )
  const readiness = evaluateDemoBidderReadiness({ bidders, latestBlock })
  console.log(
    JSON.stringify(
      {
        schema: 'cipherbid.sepolia-bidder-public-readiness.v1',
        latestBlock,
        ready: readiness.ready,
        statuses: readiness.statuses.map(printableStatus),
        note: 'Public registration and deposit maturity only; Ready remains authoritative for unspent private balance.',
      },
      null,
      2,
    ),
  )
  if (!readiness.ready) {
    const blockers = readiness.statuses.flatMap((status) =>
      status.blockers.map((blocker) => `${status.name}: ${blocker}`),
    )
    throw new Error(`Demo bidder preflight failed before any auction write:\n${blockers.join('\n')}`)
  }
}

function contractAddress(output: string): `0x${string}` {
  const match = /Contract Address:\s*(0x[0-9a-fA-F]+)/i.exec(output)
  if (!match) throw new Error('Sncast returned no contract address')
  return `0x${BigInt(match[1]).toString(16)}`
}

function deployDemoNft(auctionId: bigint): Readonly<{ address: `0x${string}`; transactionHash: `0x${string}` }> {
  const currentNonce = nonce()
  const base = [
    'deploy',
    '--network',
    'sepolia',
    '--class-hash',
    DEMO_NFT_CLASS,
    '--constructor-calldata',
    DEPLOYER,
    TOKEN_ID.toString(),
    '0',
    '--salt',
    auctionId.toString(),
    '--nonce',
    currentNonce.toString(),
  ]
  const dryRun = sncast([...base, '--dry-run', '--detailed'])
  const output = sncast(['--wait', ...base, ...boundArgs(bufferedBounds(dryRun))])
  process.stdout.write(output)
  return { address: contractAddress(output), transactionHash: transactionHash(output) }
}

function createAuction(multicallTokens: readonly string[]): `0x${string}` {
  const currentNonce = nonce()
  const base = [
    'multicall',
    'execute',
    '--network',
    'sepolia',
    '--nonce',
    currentNonce.toString(),
  ]
  const dryRun = sncast([...base, '--dry-run', '--detailed', ...multicallTokens])
  const output = sncast(['--wait', ...base, ...boundArgs(bufferedBounds(dryRun)), ...multicallTokens])
  process.stdout.write(output)
  return transactionHash(output)
}

function localRecoveryDirectory(): string {
  const root = process.env.LOCALAPPDATA ?? path.join(homedir(), 'AppData', 'Local')
  return path.join(root, 'CipherBid', 'sepolia', 'recovery')
}

async function main() {
  const options = parseOptions(process.argv.slice(2))
  if (options.planOnly && options.preflightOnly) throw new Error('--plan-only and --preflight-only cannot be combined')
  const provider = new RpcProvider({ nodeUrl: RPC_URL })
  if (!options.planOnly) {
    await requirePublicBidderReadiness(provider)
    if (options.preflightOnly) return
  }
  const nowSeconds = Math.floor(Date.now() / 1000)
  const password = process.env.CIPHERBID_RECOVERY_PASSWORD ?? randomBytes(24).toString('base64url')
  const credential = generateSellerCredential({
    network: 'sepolia',
    chainId: BigInt(CHAIN_ID),
    auctionHouse: BigInt(AUCTION_HOUSE),
    auctionId: options.auctionId,
  })
  const bundle = await createVerifiedRecoveryBundle([credential], password)
  const recoveryDirectory = localRecoveryDirectory()
  mkdirSync(recoveryDirectory, { recursive: true })
  const bundlePath = path.join(recoveryDirectory, `auction-${options.auctionId}.recovery.json`)
  writeFileSync(bundlePath, bundle.serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  let passwordPath: string | undefined
  if (!process.env.CIPHERBID_RECOVERY_PASSWORD) {
    passwordPath = path.join(recoveryDirectory, `auction-${options.auctionId}.password.txt`)
    writeFileSync(passwordPath, password, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  }

  const nft = options.nftAddress
    ? { address: options.nftAddress, transactionHash: undefined }
    : options.planOnly
      ? { address: '0x1' as const, transactionHash: undefined }
      : deployDemoNft(options.auctionId)
  const plan = buildAuctionCreationPlan({
    auctionHouse: AUCTION_HOUSE,
    nftContract: nft.address,
    tokenId: TOKEN_ID,
    auctionId: options.auctionId,
    claimHandle: credential.claimHandle,
    reserve: options.reserve,
    cap: options.cap,
    nowSeconds,
    biddingMinutes: options.biddingMinutes,
    revealMinutes: options.revealMinutes,
    bidderLimit: options.bidderLimit,
  })

  if (options.planOnly) {
    console.log(JSON.stringify({ plan: plan.form, recoveryBundleId: bundle.bundleId, bundlePath, passwordPath }, null, 2))
    return
  }

  const createTransactionHash = createAuction(plan.multicallTokens)
  const reader: ChainReader = {
    callContract: (call) => provider.callContract({ ...call, calldata: call.calldata ? [...call.calldata] : [] }),
    getClassHashAt: (value) => provider.getClassHashAt(value),
  }
  const snapshot = await readAuctionSnapshot(reader, deployment, options.auctionId)
  if (
    snapshot.config.seller !== `0x${BigInt(DEPLOYER).toString(16)}` ||
    snapshot.config.sellerClaimHandle !== credential.claimHandle ||
    snapshot.config.nftContract !== `0x${BigInt(nft.address).toString(16)}` ||
    snapshot.config.tokenId !== TOKEN_ID ||
    snapshot.config.reservePrice.toString() !== plan.form.reservePrice ||
    snapshot.config.cap.toString() !== plan.form.cap ||
    snapshot.config.biddingDeadline.toString() !== plan.form.biddingDeadline ||
    snapshot.config.revealDeadline.toString() !== plan.form.revealDeadline ||
    snapshot.config.bidderLimit.toString() !== plan.form.bidderLimit ||
    !snapshot.custodyValid
  ) {
    throw new Error('Onchain auction readback does not match the generated plan')
  }

  const evidenceDirectory = path.resolve(process.cwd(), '..', '.runtime-evidence', 'sepolia')
  mkdirSync(evidenceDirectory, { recursive: true })
  const publicRecord = {
    schema: 'cipherbid.sepolia-auction.v1',
    auctionId: plan.form.auctionId,
    auctionHouse: AUCTION_HOUSE,
    nftContract: nft.address,
    tokenId: plan.form.tokenId,
    seller: snapshot.config.seller,
    sellerClaimHandle: plan.form.sellerClaimHandle,
    reservePrice: plan.form.reservePrice,
    cap: plan.form.cap,
    biddingDeadline: plan.form.biddingDeadline,
    revealDeadline: plan.form.revealDeadline,
    bidderLimit: plan.form.bidderLimit,
    custodyValid: snapshot.custodyValid,
    recoveryBundleId: bundle.bundleId,
    bidderAccounts: BIDDER_ACCOUNTS,
    nftDeploymentTransactionHash: nft.transactionHash,
    auctionCreationTransactionHash: createTransactionHash,
    auctionUrl: `http://localhost:4110/auctions/${plan.form.auctionId}`,
    explorerUrl: `https://sepolia.voyager.online/contract/${AUCTION_HOUSE}`,
  }
  const recordPath = path.join(evidenceDirectory, `auction-${plan.form.auctionId}.json`)
  writeFileSync(recordPath, JSON.stringify(publicRecord, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  console.log(JSON.stringify({ ...publicRecord, bundlePath, passwordPath, recordPath }, null, 2))
  console.log('Import the seller account into Ready by revealing the Sncast key locally; the script never prints it.')
  console.log('Bidder A and B are already deployed and funded; import their keys locally into Ready and submit immediately.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Auction creation failed')
  process.exitCode = 1
})
