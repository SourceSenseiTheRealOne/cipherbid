import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { hash, RpcProvider } from 'starknet'
import {
  MAINNET_ACCOUNT_NAME,
  MAINNET_ACCOUNT_FILE,
  MAINNET_MAXIMUM_BUDGET,
  MAINNET_MINIMUM_FUNDING,
  buildMainnetDeploymentPlan,
  parseBufferedGasBounds,
  parseFrozenMainnetAccount,
  requireFrozenMainnetAccount,
  type GasBounds,
} from '@/config/mainnetDeploymentPlan'
import { MAINNET_CHAIN_ID, MAINNET_STRK20_POOL, STRK_TOKEN } from '@/config/deployment'
import { MAINNET_DEPLOYER } from '@/config/mainnetRelease'

const RPC_URL = 'https://api.zan.top/public/starknet-mainnet/rpc/v0_10'

const READY_ACCOUNT_CLASS_HASH = '0x036078334509b514626504edc9fb252328d1a240e4e948bef8d0c08dff45927f'
const contractsDirectory = path.resolve(process.cwd(), '..', 'contracts')
const artifactDirectory = path.join(contractsDirectory, 'target', 'dev')

function windowsToWsl(value: string): string {
  const normalized = path.resolve(value)
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(normalized)
  if (!match) throw new Error(`Cannot convert path to WSL: ${normalized}`)
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`
}

function runWsl(tokens: readonly string[], workdir = contractsDirectory): string {
  const command = `cd ${shellQuote(windowsToWsl(workdir))} && ${tokens.map(shellQuote).join(' ')}`
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

async function classDeclared(classHash: string): Promise<boolean> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'starknet_getClass',
      params: { block_id: 'latest', class_hash: classHash },
    }),
  })
  if (!response.ok) throw new Error(`Mainnet RPC class lookup returned HTTP ${response.status}`)
  const payload = (await response.json()) as Readonly<{
    result?: unknown
    error?: Readonly<{ code?: number; message?: string }>
  }>
  if (payload.result !== undefined) return true
  if (payload.error?.code === 28) return false
  throw new Error(`Mainnet RPC class lookup failed: ${payload.error?.message ?? 'unknown error'}`)
}

async function accountClassHash(): Promise<string | null> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'starknet_getClassHashAt',
      params: { block_id: 'latest', contract_address: MAINNET_DEPLOYER },
    }),
  })
  if (!response.ok) throw new Error(`Mainnet RPC account lookup returned HTTP ${response.status}`)
  const payload = (await response.json()) as Readonly<{
    result?: string
    error?: Readonly<{ code?: number; message?: string }>
  }>
  if (payload.result !== undefined) return payload.result
  if (payload.error?.code === 20) return null
  throw new Error(`Mainnet RPC account lookup failed: ${payload.error?.message ?? 'unknown error'}`)
}

function verifyArtifact(contractName: 'AuctionHouse' | 'DemoERC721', expectedClassHash: string): void {
  const artifactPath = path.join(artifactDirectory, `cipherbid_${contractName}.contract_class.json`)
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as Parameters<
    typeof hash.computeSierraContractClassHash
  >[0]
  const actualClassHash = hash.computeSierraContractClassHash(artifact)
  if (!sameFelt(actualClassHash, expectedClassHash)) {
    throw new Error(`${contractName} artifact class hash does not match the frozen release candidate`)
  }
}

async function readPublicPrerequisites(provider: RpcProvider): Promise<
  Readonly<{
    deployed: boolean
    publicBalance: bigint
  }>
> {
  const chainId = await provider.getChainId()
  if (!sameFelt(chainId, MAINNET_CHAIN_ID)) throw new Error('RPC is not Starknet mainnet')
  const deployedClassHash = await accountClassHash()
  if (deployedClassHash !== null && !sameFelt(deployedClassHash, READY_ACCOUNT_CLASS_HASH)) {
    throw new Error('Mainnet deployer does not use the frozen Ready account class')
  }
  const balanceResponse = await provider.callContract({
    contractAddress: STRK_TOKEN,
    entrypoint: 'balance_of',
    calldata: [MAINNET_DEPLOYER],
  })
  const balanceValues = callValues(balanceResponse)
  const low = BigInt(balanceValues[0] ?? '0')
  const high = BigInt(balanceValues[1] ?? '0')
  return Object.freeze({ deployed: deployedClassHash !== null, publicBalance: low + (high << 128n) })
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const execute = argv.includes('--execute')
  if (argv.some((value) => value !== '--execute')) throw new Error('Only --execute is supported')

  const plan = buildMainnetDeploymentPlan()
  runWsl(['scarb', 'build'])
  for (const declaration of plan.declarations) verifyArtifact(declaration.contractName, declaration.classHash)

  const provider = new RpcProvider({ nodeUrl: RPC_URL })
  const localAccount = parseFrozenMainnetAccount(accountList())
  const publicAccount = await readPublicPrerequisites(provider)
  if (localAccount.deployed !== publicAccount.deployed) {
    throw new Error('Local account deployment state does not match mainnet')
  }
  const declarationState = await Promise.all(
    plan.declarations.map(async (declaration) => ({
      ...declaration,
      declared: await classDeclared(declaration.classHash),
    })),
  )

  if (!execute) {
    console.log(
      JSON.stringify(
        {
          mode: 'plan-only',
          ...plan,
          minimumFunding: plan.minimumFunding.toString(),
          maximumBudget: plan.maximumBudget.toString(),
          account: {
            ...localAccount,
            publicBalance: publicAccount.publicBalance.toString(),
          },
          declarations: declarationState,
          rpcUrl: RPC_URL,
          note: 'No mainnet transaction was submitted. First execution deploys the Ready account when funded.',
        },
        null,
        2,
      ),
    )
    return
  }

  let remainingBudget = plan.maximumBudget
  let accountDeploymentTransactionHash: string | undefined
  const declarationTransactions: Array<
    Readonly<{ contractName: string; classHash: string; transactionHash?: string }>
  > = []

  if (!publicAccount.deployed) {
    if (publicAccount.publicBalance < MAINNET_MINIMUM_FUNDING) {
      throw new Error('Counterfactual mainnet deployer must hold at least 151 STRK before first execution')
    }
    const accountDeploymentBase = [
      'account',
      'deploy',
      '--network',
      'mainnet',
      '--name',
      MAINNET_ACCOUNT_NAME,
      '--silent',
    ]
    const accountDeploymentDryRun = sncast([...accountDeploymentBase, '--dry-run', '--detailed'])
    const accountDeploymentBounds = parseBufferedGasBounds(accountDeploymentDryRun, remainingBudget)
    const accountDeploymentOutput = sncast(['--wait', ...accountDeploymentBase, ...boundArgs(accountDeploymentBounds)])
    accountDeploymentTransactionHash = parseLine(accountDeploymentOutput, 'Transaction Hash')
    remainingBudget -= accountDeploymentBounds.ceiling
    const deployedClassHash = await accountClassHash()
    if (deployedClassHash === null || !sameFelt(deployedClassHash, READY_ACCOUNT_CLASS_HASH)) {
      throw new Error('Ready account deployment did not produce the frozen account class')
    }
    requireFrozenMainnetAccount(accountList())
  } else {
    if (publicAccount.publicBalance < MAINNET_MAXIMUM_BUDGET) {
      throw new Error('Mainnet deployer public balance is below the frozen 150 STRK ceiling')
    }
    requireFrozenMainnetAccount(accountList())
  }

  for (const declaration of declarationState) {
    if (declaration.declared) {
      declarationTransactions.push({ contractName: declaration.contractName, classHash: declaration.classHash })
      continue
    }
    const base = [
      'declare',
      '--network',
      'mainnet',
      '--contract-name',
      declaration.contractName,
      '--nonce',
      nonce().toString(),
    ]
    const dryRun = sncast([...base, '--dry-run', '--detailed'])
    const bounds = parseBufferedGasBounds(dryRun, remainingBudget)
    const output = sncast(['--wait', ...base, ...boundArgs(bounds)])
    const returnedClassHash = parseLine(output, 'Class Hash')
    const transactionHash = parseLine(output, 'Transaction Hash')
    if (!sameFelt(returnedClassHash, declaration.classHash)) {
      throw new Error(`${declaration.contractName} declaration returned an unexpected class hash`)
    }
    if (!(await classDeclared(declaration.classHash))) {
      throw new Error(`${declaration.contractName} declaration was not readable after acceptance`)
    }
    remainingBudget -= bounds.ceiling
    declarationTransactions.push({
      contractName: declaration.contractName,
      classHash: declaration.classHash,
      transactionHash,
    })
  }

  const deploymentBase = [
    'deploy',
    '--network',
    'mainnet',
    '--class-hash',
    plan.auctionHouse.classHash,
    '--constructor-calldata',
    ...plan.auctionHouse.constructorCalldata,
    '--salt',
    plan.auctionHouse.salt,
    '--nonce',
    nonce().toString(),
  ]
  const deploymentDryRun = sncast([...deploymentBase, '--dry-run', '--detailed'])
  const deploymentBounds = parseBufferedGasBounds(deploymentDryRun, remainingBudget)
  const deploymentOutput = sncast(['--wait', ...deploymentBase, ...boundArgs(deploymentBounds)])
  const auctionHouse = parseLine(deploymentOutput, 'Contract Address') as `0x${string}`
  const deploymentTransactionHash = parseLine(deploymentOutput, 'Transaction Hash')
  remainingBudget -= deploymentBounds.ceiling

  const [deployedClassHash, houseResponse] = await Promise.all([
    provider.getClassHashAt(auctionHouse),
    provider.callContract({ contractAddress: auctionHouse, entrypoint: 'get_house_config' }),
  ])
  const houseConfig = callValues(houseResponse)
  if (!sameFelt(deployedClassHash, plan.auctionHouse.classHash))
    throw new Error('Deployed AuctionHouse class hash mismatch')
  if (!sameFelt(houseConfig[0] ?? '', MAINNET_STRK20_POOL)) throw new Error('Deployed AuctionHouse pool mismatch')
  if (!sameFelt(houseConfig[1] ?? '', STRK_TOKEN)) throw new Error('Deployed AuctionHouse payment token mismatch')
  if (BigInt(houseConfig[2] ?? '0') !== 32n) throw new Error('Deployed AuctionHouse bidder bound mismatch')

  const publicRecord = {
    schema: 'cipherbid.mainnet-deployment.v1',
    network: 'mainnet',
    chainId: MAINNET_CHAIN_ID,
    deployer: MAINNET_DEPLOYER,
    auctionHouse,
    auctionHouseClassHash: plan.auctionHouse.classHash,
    demoErc721ClassHash: plan.demoNft.classHash,
    strk20Pool: MAINNET_STRK20_POOL,
    paymentToken: STRK_TOKEN,
    maximumBudget: plan.maximumBudget.toString(),
    remainingBudgetCeiling: remainingBudget.toString(),
    accountDeploymentTransactionHash,
    declarationTransactions,
    deploymentTransactionHash,
    explorerUrl: `https://voyager.online/contract/${auctionHouse}`,
  }
  const evidenceDirectory = path.resolve(process.cwd(), '..', '.runtime-evidence', 'mainnet')
  mkdirSync(evidenceDirectory, { recursive: true })
  const recordPath = path.join(evidenceDirectory, 'deployment.json')
  writeFileSync(recordPath, JSON.stringify(publicRecord, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  console.log(JSON.stringify({ ...publicRecord, recordPath }, null, 2))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
