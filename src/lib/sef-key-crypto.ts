import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

/**
 * SEF API key at rest (ROADMAP A3). AES-256-GCM with a key derived per company:
 * HKDF-SHA256(master key, salt = profileId). The profileId is also the GCM additional data,
 * so a ciphertext copied to another company's row does not decrypt.
 * The master key is 32 random bytes, base64, in SEF_KEY_ENCRYPTION_KEY; it never touches the database.
 * Server-only: never import this from a client component.
 */
const VERSION = 'v1'
const HKDF_INFO = 'trademaster:sef-api-key:v1'

export class SefKeyCryptoError extends Error {}

export function readMasterKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = env.SEF_KEY_ENCRYPTION_KEY?.trim()
  if (!raw) return null
  const key = Buffer.from(raw, 'base64')
  return key.length === 32 ? key : null
}

function tenantKey(masterKey: Buffer, profileId: string): Buffer {
  if (masterKey.length !== 32) throw new SefKeyCryptoError('Master key must be 32 bytes')
  if (!profileId) throw new SefKeyCryptoError('profileId is required')
  return Buffer.from(hkdfSync('sha256', masterKey, Buffer.from(profileId, 'utf8'), HKDF_INFO, 32))
}

export function encryptSefApiKey(apiKey: string, profileId: string, masterKey: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', tenantKey(masterKey, profileId), iv)
  cipher.setAAD(Buffer.from(profileId, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function decryptSefApiKey(stored: string, profileId: string, masterKey: Buffer): string {
  const [version, iv, tag, ciphertext] = stored.split('.')
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new SefKeyCryptoError('Unknown ciphertext format')
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', tenantKey(masterKey, profileId), Buffer.from(iv, 'base64url'))
    decipher.setAAD(Buffer.from(profileId, 'utf8'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    // Never echo the ciphertext or key material in the error.
    throw new SefKeyCryptoError('SEF API key could not be decrypted')
  }
}
