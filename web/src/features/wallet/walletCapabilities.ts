const REQUIRED_WALLET_API = [0, 10, 3] as const

function parseWalletApiVersion(version: string): readonly [number, number, number] | null {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version)
  if (!match) return null

  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
}

function isAtLeastRequired(version: readonly [number, number, number]) {
  for (let index = 0; index < REQUIRED_WALLET_API.length; index += 1) {
    if (version[index] > REQUIRED_WALLET_API[index]) return true
    if (version[index] < REQUIRED_WALLET_API[index]) return false
  }
  return true
}

export function supportsWalletApiVersion(versions: readonly string[]): boolean {
  return versions.some((version) => {
    const parsed = parseWalletApiVersion(version)
    return parsed !== null && isAtLeastRequired(parsed)
  })
}
