import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { RpcProvider } from 'starknet'
import { parseMainnetDeploymentRecord, buildMainnetAuctionCreationPlan } from '@/config/mainnetAuctionPlan'
import {
  AUCTION_HOUSE_CLASS_HASH,
  DEMO_ERC721_CLASS_HASH,
  MAINNET_ACCOUNT_NAME,
  MAINNET_ACCOUNT_FILE,
  parseBufferedGasBounds,
  requireFrozenMainnetAccount,
  type GasBounds,
} from '@/config/mainnetDeploymentPlan'
import { MAINNET_CHAIN_ID, MAINNET_STRK20_POOL, STRK_TOKEN, type DeploymentManifest } from '@/config/deployment'
import { MAINNET_DEPLOYER } from '@/config/mainnetRelease'
import { generateSellerCredential } from '@/features/credentials/credentials'
import { createVerifiedRecoveryBundle } from '@/features/credentials/recoveryBundle'
import { readAuctionSnapshot, type ChainReader } from '@/features/auction/auctionReader'

const RPC_URL = 'https://api.zan.top/public/starknet-mainnet/rpc/v0_10'

const TOKEN_ID = 99n
const contractsDirectory = path.resolve(process.cwd(), '..', 'contracts')
const defaultDeploymentRecord = path.resolve(process.cwd(), '..', '.runtime-evidence', 'mainnet', 'deployment.json')

type Options = Readonly<{
  execute: boolean
  auctionId: bigint
  deploymentRecord: string
}>

function optionValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name)
  if (index < 0) return undefined
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

function parseOptions(argv: readonly string[]): Options {
  const supported = new Set(['--execute', '--auction-id', '--deployment-record'])
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]!
    if (!supported.has(value)) throw new Error(`Unsupported option: ${value}`)
    if (value !== '--execute') index += 1
  }
  return Object.freeze({
    execute: argv.includes('--execute'),
    auctionId: BigInt(optionValue(argv, '--auction-id') ?? Date.now().toString()),
    deploymentRecord: path.resolve(optionValue(argv, '--deployment-record') ?? defaultDeploymentRecord),
  })
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

function runWsl(tokens: readonly string[]): string {
  const command = `cd ${shellQuote(windowsToWsl(contractsDirectory))} && ${tokens.map(shellQuote).join(' ')}`
  const result = spawnSync('wsl.exe', ['-d', 'Ubuntu-24.04', '--', 'bash', '-lc', command], {
    encoding: 'utf8',
    windowsHide: true,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  if (result.status !== 0) throw new Error(`Command failed (${result.status ?? 'unknown'}):\n${output}`)
  return output
}

function sncast(args: readonly string[]): string {
  return runWsl(['sncast', '--account', MAINNET_ACCOUNT_NAME, '--accounts-file', MAINNET_ACCOUNT_FILE, ...args])
}

function accountList(): string {
  return runWsl(['sncast', '--accounts-file', MAINNET_ACCOUNT_FILE, 'account', 'list'])
}

function parseLine(output: string, label: string): string {
  const match = new RegExp(`${label}:\\s*(0x[0-9a-fA-F]+|\\d+)`, 'i').exec(output)
  if (!match) throw new Error(`Could not parse ${label} from sncast output`)
  return match[1]
}

function nonce(): bigint {
  return BigInt(
    parseLine(sncast(['get', 'nonce', '--network', 'mainnet', MAINNET_DEPLOYER, '--block-id', 'latest']), 'Nonce'),
  )
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
  ]
}

function sameFelt(left: string, right: string): boolean {
  try {
    return BigInt(left) === BigInt(right)
  } catch {
    return false
  }
}

function callValues(value: readonly string[] | Readonly<{ result: readonly string[] }>): readonly string[] {
  return 'result' in value ? value.result : value
}

function runMainnetPreflight(): void {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(executable, ['--yes', 'pnpm@10.18.1', 'exec', 'tsx', 'scripts/preflight-mainnet.ts'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true,
  })
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  if (result.status !== 0) throw new Error('Mainnet bidder readiness failed before auction creation')
}

function recoveryDirectory(): string {
  const root = process.env.LOCALAPPDATA ?? path.join(homedir(), 'AppData', 'Local')
  return path.join(root, 'CipherBid', 'mainnet', 'recovery')
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  if (!existsSync(options.deploymentRecord)) {
    throw new Error(`Verified mainnet deployment record not found: ${options.deploymentRecord}`)
  }
  const deploymentRecord = parseMainnetDeploymentRecord(readFileSync(options.deploymentRecord, 'utf8'))
  const placeholderPlan = buildMainnetAuctionCreationPlan({
    auctionHouse: deploymentRecord.auctionHouse,
    nftContract: deploymentRecord.demoNft,
    auctionId: options.auctionId,
    sellerClaimHandle: 1n,
    nowSeconds: Math.floor(Date.now() / 1000),
  })
  if (!options.execute) {
    console.log(
      JSON.stringify(
        {
          mode: 'plan-only',
          auctionHouse: deploymentRecord.auctionHouse,
          nftContract: deploymentRecord.demoNft,
          remainingBudgetCeiling: deploymentRecord.remainingBudgetCeiling.toString(),
          terms: placeholderPlan.form,
          note: 'No credential, recovery file, NFT, or auction transaction was created.',
        },
        null,
        2,
      ),
    )
    return
  }

  runMainnetPreflight()
  requireFrozenMainnetAccount(accountList())
  let remainingBudget = deploymentRecord.remainingBudgetCeiling
  const provider = new RpcProvider({ nodeUrl: RPC_URL })

  const [nftClassHash, nftOwnerResponse] = await Promise.all([
    provider.getClassHashAt(deploymentRecord.demoNft),
    provider.callContract({
      contractAddress: deploymentRecord.demoNft,
      entrypoint: 'owner_of',
      calldata: [TOKEN_ID.toString(), '0'],
    }),
  ])
  if (!sameFelt(nftClassHash, DEMO_ERC721_CLASS_HASH)) throw new Error('Mainnet DemoERC721 class hash mismatch')
  const [nftOwner] = callValues(nftOwnerResponse)
  if (!nftOwner || !sameFelt(nftOwner, MAINNET_DEPLOYER)) {
    throw new Error('Mainnet DemoERC721 token owner mismatch')
  }

  const password = process.env.CIPHERBID_RECOVERY_PASSWORD ?? randomBytes(24).toString('base64url')
  const credential = generateSellerCredential({
    network: 'mainnet',
    chainId: BigInt(MAINNET_CHAIN_ID),
    auctionHouse: BigInt(deploymentRecord.auctionHouse),
    auctionId: options.auctionId,
  })
  const bundle = await createVerifiedRecoveryBundle([credential], password)
  const localRecoveryDirectory = recoveryDirectory()
  mkdirSync(localRecoveryDirectory, { recursive: true })
  const bundlePath = path.join(localRecoveryDirectory, `auction-${options.auctionId}.recovery.json`)
  writeFileSync(bundlePath, bundle.serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  let passwordPath: string | undefined
  if (!process.env.CIPHERBID_RECOVERY_PASSWORD) {
    passwordPath = path.join(localRecoveryDirectory, `auction-${options.auctionId}.password.txt`)
    writeFileSync(passwordPath, password, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  }

  const creationPlan = buildMainnetAuctionCreationPlan({
    auctionHouse: deploymentRecord.auctionHouse,
    nftContract: deploymentRecord.demoNft,
    auctionId: options.auctionId,
    sellerClaimHandle: credential.claimHandle,
    nowSeconds: Math.floor(Date.now() / 1000),
  })
  const createBase = ['multicall', 'execute', '--network', 'mainnet', '--nonce', nonce().toString()]
  const createDryRun = sncast([...createBase, '--dry-run', '--detailed', ...creationPlan.multicallTokens])
  const createBounds = parseBufferedGasBounds(createDryRun, remainingBudget)
  const createOutput = sncast(['--wait', ...createBase, ...boundArgs(createBounds), ...creationPlan.multicallTokens])
  const auctionCreationTransactionHash = parseLine(createOutput, 'Transaction Hash')
  remainingBudget -= createBounds.ceiling

  const deployment: DeploymentManifest = {
    network: 'mainnet',
    chainId: MAINNET_CHAIN_ID,
    rpcUrl: RPC_URL,
    auctionHouse: deploymentRecord.auctionHouse,
    auctionHouseClassHash: AUCTION_HOUSE_CLASS_HASH,
    strk20Pool: MAINNET_STRK20_POOL,
    paymentToken: STRK_TOKEN,
  }
  const reader: ChainReader = {
    callContract: (call) => provider.callContract({ ...call, calldata: call.calldata ? [...call.calldata] : [] }),
    getClassHashAt: (address) => provider.getClassHashAt(address),
  }
  const snapshot = await readAuctionSnapshot(reader, deployment, options.auctionId)
  if (
    !sameFelt(snapshot.config.seller, MAINNET_DEPLOYER) ||
    snapshot.config.sellerClaimHandle !== credential.claimHandle ||
    !sameFelt(snapshot.config.nftContract, deploymentRecord.demoNft) ||
    snapshot.config.tokenId !== TOKEN_ID ||
    snapshot.config.reservePrice.toString() !== creationPlan.form.reservePrice ||
    snapshot.config.cap.toString() !== creationPlan.form.cap ||
    snapshot.config.biddingDeadline.toString() !== creationPlan.form.biddingDeadline ||
    snapshot.config.revealDeadline.toString() !== creationPlan.form.revealDeadline ||
    snapshot.config.bidderLimit.toString() !== creationPlan.form.bidderLimit ||
    !snapshot.custodyValid
  ) {
    throw new Error('Mainnet auction readback does not match the frozen creation plan')
  }

  const publicRecord = {
    schema: 'cipherbid.mainnet-auction.v1',
    auctionId: creationPlan.form.auctionId,
    auctionHouse: deploymentRecord.auctionHouse,
    nftContract: deploymentRecord.demoNft,
    tokenId: creationPlan.form.tokenId,
    seller: snapshot.config.seller,
    sellerClaimHandle: creationPlan.form.sellerClaimHandle,
    reservePrice: creationPlan.form.reservePrice,
    cap: creationPlan.form.cap,
    biddingDeadline: creationPlan.form.biddingDeadline,
    revealDeadline: creationPlan.form.revealDeadline,
    bidderLimit: creationPlan.form.bidderLimit,
    custodyValid: snapshot.custodyValid,
    recoveryBundleId: bundle.bundleId,
    nftDeploymentTransactionHash: deploymentRecord.demoNftDeploymentTransactionHash,
    auctionCreationTransactionHash,
    remainingBudgetCeiling: remainingBudget.toString(),
    auctionUrl: `http://localhost:4110/auction?id=${creationPlan.form.auctionId}`,
    explorerUrl: `https://voyager.online/contract/${deploymentRecord.auctionHouse}`,
  }
  const evidenceDirectory = path.resolve(process.cwd(), '..', '.runtime-evidence', 'mainnet')
  const recordPath = path.join(evidenceDirectory, `auction-${creationPlan.form.auctionId}.json`)
  writeFileSync(recordPath, JSON.stringify(publicRecord, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  console.log(JSON.stringify({ ...publicRecord, bundlePath, passwordPath, recordPath }, null, 2))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
