import {
  bindAcceptedIndex,
  createBidderCredential,
  createSellerCredential,
  type BidderCredential,
  type CipherBidCredential,
} from '@/features/credentials/credentials'

const BUNDLE_SCHEMA = 'cipherbid.recovery.v1'
const PAYLOAD_SCHEMA = 'cipherbid.recovery.payload.v1'
const PBKDF2_ITERATIONS = 210_000
const MAX_BUNDLE_BYTES = 65_536
const MAX_CREDENTIALS = 32
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

type RecoveryHeader = Readonly<{
  schema: typeof BUNDLE_SCHEMA
  kdf: Readonly<{
    name: 'PBKDF2'
    hash: 'SHA-256'
    iterations: number
    salt: string
  }>
  cipher: Readonly<{
    name: 'AES-GCM'
    iv: string
    tagLength: 128
  }>
}>

type RecoveryEnvelope = RecoveryHeader & { ciphertext: string }

type PlainCredential = Record<string, string | number>

function cryptoApi(): Crypto {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error('Web Crypto is unavailable')
  }
  return globalThis.crypto
}

function passwordBytes(password: string): Uint8Array {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Recovery password must contain at least 12 characters')
  if (password.length > 1_024) throw new Error('Recovery password is too long')
  return encoder.encode(password)
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: unknown, label: string): Uint8Array {
  if (typeof value !== 'string' || value.length === 0 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${label} is malformed`)
  }
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error('Structured input has unexpected fields')
  }
}

function bigintString(value: unknown, label: string, format: 'hex' | 'decimal'): bigint {
  if (typeof value !== 'string' || value.length === 0 || value.length > 80) throw new Error(`${label} is malformed`)
  const expression = format === 'hex' ? /^0x[0-9a-f]+$/ : /^(0|[1-9][0-9]*)$/
  if (!expression.test(value)) throw new Error(`${label} is malformed`)
  return BigInt(value)
}

function toPlain(credential: CipherBidCredential): PlainCredential {
  const base = {
    schema: credential.schema,
    role: credential.role,
    network: credential.network,
    chainId: `0x${credential.chainId.toString(16)}`,
    auctionHouse: `0x${credential.auctionHouse.toString(16)}`,
    auctionId: credential.auctionId.toString(10),
    claimSecret: `0x${credential.claimSecret.toString(16)}`,
    claimHandle: `0x${credential.claimHandle.toString(16)}`,
  }
  if (credential.role === 'seller') return base
  return {
    ...base,
    bidNonce: `0x${credential.bidNonce.toString(16)}`,
    amount: credential.amount.toString(10),
    assetRecipient: `0x${credential.assetRecipient.toString(16)}`,
    commitment: `0x${credential.commitment.toString(16)}`,
    ...(credential.acceptedIndex === undefined ? {} : { acceptedIndex: credential.acceptedIndex }),
  }
}

function parseCommon(value: Record<string, unknown>) {
  if (value.schema !== 'cipherbid.credential.v1') throw new Error('Unsupported credential schema')
  if (value.network !== 'sepolia' && value.network !== 'mainnet') throw new Error('Unsupported credential network')
  return {
    network: value.network,
    chainId: bigintString(value.chainId, 'chainId', 'hex'),
    auctionHouse: bigintString(value.auctionHouse, 'auctionHouse', 'hex'),
    auctionId: bigintString(value.auctionId, 'auctionId', 'decimal'),
    claimSecret: bigintString(value.claimSecret, 'claimSecret', 'hex'),
  } as const
}

function fromPlain(value: unknown): CipherBidCredential {
  if (!isRecord(value)) throw new Error('Credential must be an object')
  if (value.role === 'seller') {
    exactKeys(value, [
      'schema',
      'role',
      'network',
      'chainId',
      'auctionHouse',
      'auctionId',
      'claimSecret',
      'claimHandle',
    ])
    const credential = createSellerCredential(parseCommon(value))
    if (credential.claimHandle !== bigintString(value.claimHandle, 'claimHandle', 'hex')) {
      throw new Error('Seller claim handle does not match secret')
    }
    return credential
  }
  if (value.role !== 'bidder') throw new Error('Unsupported credential role')
  const hasAcceptedIndex = Object.hasOwn(value, 'acceptedIndex')
  exactKeys(value, [
    'schema',
    'role',
    'network',
    'chainId',
    'auctionHouse',
    'auctionId',
    'claimSecret',
    'claimHandle',
    'bidNonce',
    'amount',
    'assetRecipient',
    'commitment',
    ...(hasAcceptedIndex ? ['acceptedIndex'] : []),
  ])
  let credential: BidderCredential = createBidderCredential({
    ...parseCommon(value),
    bidNonce: bigintString(value.bidNonce, 'bidNonce', 'hex'),
    amount: bigintString(value.amount, 'amount', 'decimal'),
    assetRecipient: bigintString(value.assetRecipient, 'assetRecipient', 'hex'),
  })
  if (credential.claimHandle !== bigintString(value.claimHandle, 'claimHandle', 'hex')) {
    throw new Error('Bidder claim handle does not match secret')
  }
  if (credential.commitment !== bigintString(value.commitment, 'commitment', 'hex')) {
    throw new Error('Bid commitment does not match credential fields')
  }
  if (hasAcceptedIndex) {
    if (typeof value.acceptedIndex !== 'number') throw new Error('acceptedIndex is malformed')
    credential = bindAcceptedIndex(credential, value.acceptedIndex)
  }
  return credential
}

function payloadBytes(credentials: readonly CipherBidCredential[]): Uint8Array {
  if (!Array.isArray(credentials) || credentials.length === 0 || credentials.length > MAX_CREDENTIALS) {
    throw new Error(`Recovery bundle must contain between 1 and ${MAX_CREDENTIALS} credentials`)
  }
  return encoder.encode(JSON.stringify({ schema: PAYLOAD_SCHEMA, credentials: credentials.map(toPlain) }))
}

function parsePayload(bytes: Uint8Array): readonly CipherBidCredential[] {
  const parsed = JSON.parse(decoder.decode(bytes)) as unknown
  if (!isRecord(parsed)) throw new Error('Recovery payload must be an object')
  exactKeys(parsed, ['schema', 'credentials'])
  if (parsed.schema !== PAYLOAD_SCHEMA || !Array.isArray(parsed.credentials)) throw new Error('Unsupported recovery payload')
  if (parsed.credentials.length === 0 || parsed.credentials.length > MAX_CREDENTIALS) {
    throw new Error('Recovery payload credential count is invalid')
  }
  return Object.freeze(parsed.credentials.map(fromPlain))
}

function parseEnvelope(serialized: string): RecoveryEnvelope {
  if (typeof serialized !== 'string' || serialized.length === 0 || encoder.encode(serialized).length > MAX_BUNDLE_BYTES) {
    throw new Error('Recovery envelope size is invalid')
  }
  const parsed = JSON.parse(serialized) as unknown
  if (!isRecord(parsed)) throw new Error('Recovery envelope must be an object')
  exactKeys(parsed, ['schema', 'kdf', 'cipher', 'ciphertext'])
  if (parsed.schema !== BUNDLE_SCHEMA || !isRecord(parsed.kdf) || !isRecord(parsed.cipher)) {
    throw new Error('Unsupported recovery envelope')
  }
  exactKeys(parsed.kdf, ['name', 'hash', 'iterations', 'salt'])
  exactKeys(parsed.cipher, ['name', 'iv', 'tagLength'])
  if (
    parsed.kdf.name !== 'PBKDF2' ||
    parsed.kdf.hash !== 'SHA-256' ||
    parsed.kdf.iterations !== PBKDF2_ITERATIONS ||
    parsed.cipher.name !== 'AES-GCM' ||
    parsed.cipher.tagLength !== 128 ||
    typeof parsed.ciphertext !== 'string'
  ) {
    throw new Error('Unsupported recovery cryptography')
  }
  decodeBase64Url(parsed.kdf.salt, 'salt')
  decodeBase64Url(parsed.cipher.iv, 'iv')
  decodeBase64Url(parsed.ciphertext, 'ciphertext')
  return parsed as unknown as RecoveryEnvelope
}

function headerOf(envelope: RecoveryEnvelope): RecoveryHeader {
  return { schema: envelope.schema, kdf: envelope.kdf, cipher: envelope.cipher }
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function deriveKey(password: Uint8Array, salt: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> {
  const api = cryptoApi()
  const material = await api.subtle.importKey('raw', ownedBuffer(password), 'PBKDF2', false, ['deriveKey'])
  return api.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: ownedBuffer(salt), iterations: PBKDF2_ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usage,
  )
}

export async function encryptRecoveryBundle(
  credentials: readonly CipherBidCredential[],
  password: string,
): Promise<string> {
  const api = cryptoApi()
  const secret = passwordBytes(password)
  const plaintext = payloadBytes(credentials)
  const salt = api.getRandomValues(new Uint8Array(16))
  const iv = api.getRandomValues(new Uint8Array(12))
  const envelope: RecoveryEnvelope = {
    schema: BUNDLE_SCHEMA,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: base64Url(salt) },
    cipher: { name: 'AES-GCM', iv: base64Url(iv), tagLength: 128 },
    ciphertext: '',
  }
  try {
    const key = await deriveKey(secret, salt, ['encrypt'])
    const aad = encoder.encode(JSON.stringify(headerOf(envelope)))
    const encrypted = await api.subtle.encrypt(
      { name: 'AES-GCM', iv: ownedBuffer(iv), additionalData: ownedBuffer(aad), tagLength: 128 },
      key,
      ownedBuffer(plaintext),
    )
    envelope.ciphertext = base64Url(new Uint8Array(encrypted))
    const serialized = JSON.stringify(envelope)
    if (encoder.encode(serialized).length > MAX_BUNDLE_BYTES) throw new Error('Encrypted recovery bundle is too large')
    return serialized
  } finally {
    secret.fill(0)
    plaintext.fill(0)
  }
}

export async function decryptRecoveryBundle(
  serialized: string,
  password: string,
): Promise<readonly CipherBidCredential[]> {
  let result: readonly CipherBidCredential[] | undefined
  let failed = false
  let secret: Uint8Array | undefined
  let plaintext: Uint8Array | undefined
  try {
    const api = cryptoApi()
    const envelope = parseEnvelope(serialized)
    secret = passwordBytes(password)
    const salt = decodeBase64Url(envelope.kdf.salt, 'salt')
    const iv = decodeBase64Url(envelope.cipher.iv, 'iv')
    const ciphertext = decodeBase64Url(envelope.ciphertext, 'ciphertext')
    const key = await deriveKey(secret, salt, ['decrypt'])
    const aad = encoder.encode(JSON.stringify(headerOf(envelope)))
    const decrypted = await api.subtle.decrypt(
      { name: 'AES-GCM', iv: ownedBuffer(iv), additionalData: ownedBuffer(aad), tagLength: 128 },
      key,
      ownedBuffer(ciphertext),
    )
    plaintext = new Uint8Array(decrypted)
    result = parsePayload(plaintext)
  } catch {
    failed = true
  } finally {
    secret?.fill(0)
    plaintext?.fill(0)
  }
  if (failed || !result) throw new Error('Recovery bundle could not be decrypted or validated')
  return result
}

export async function createVerifiedRecoveryBundle(
  credentials: readonly CipherBidCredential[],
  password: string,
): Promise<Readonly<{ serialized: string; bundleId: `0x${string}`; credentialCount: number }>> {
  const serialized = await encryptRecoveryBundle(credentials, password)
  const recovered = await decryptRecoveryBundle(serialized, password)
  if (JSON.stringify(recovered.map(toPlain)) !== JSON.stringify(credentials.map(toPlain))) {
    throw new Error('Recovery bundle import verification failed')
  }
  const digest = await cryptoApi().subtle.digest('SHA-256', ownedBuffer(encoder.encode(serialized)))
  const bundleId = `0x${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}` as const
  return Object.freeze({ serialized, bundleId, credentialCount: recovered.length })
}
