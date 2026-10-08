import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { SefKeyCryptoError, decryptSefApiKey, encryptSefApiKey, readMasterKey } from './sef-key-crypto'

const master = randomBytes(32)
const apiKey = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

describe('SEF API key encryption', () => {
  it('round-trips for the same company', () => {
    const stored = encryptSefApiKey(apiKey, 'profile-a', master)
    expect(decryptSefApiKey(stored, 'profile-a', master)).toBe(apiKey)
  })

  it('never stores the key in clear text and uses a fresh IV each time', () => {
    const first = encryptSefApiKey(apiKey, 'profile-a', master)
    const second = encryptSefApiKey(apiKey, 'profile-a', master)
    expect(first).not.toContain(apiKey)
    expect(first.startsWith('v1.')).toBe(true)
    expect(first).not.toBe(second)
  })

  it('does not decrypt for another company, another master key, or a tampered value', () => {
    const stored = encryptSefApiKey(apiKey, 'profile-a', master)
    expect(() => decryptSefApiKey(stored, 'profile-b', master)).toThrow(SefKeyCryptoError)
    expect(() => decryptSefApiKey(stored, 'profile-a', randomBytes(32))).toThrow(SefKeyCryptoError)
    const parts = stored.split('.')
    parts[3] = Buffer.from('tampered').toString('base64url')
    expect(() => decryptSefApiKey(parts.join('.'), 'profile-a', master)).toThrow(SefKeyCryptoError)
    expect(() => decryptSefApiKey('garbage', 'profile-a', master)).toThrow(SefKeyCryptoError)
  })

  it('errors never contain the key or ciphertext', () => {
    const stored = encryptSefApiKey(apiKey, 'profile-a', master)
    try {
      decryptSefApiKey(stored, 'profile-b', master)
    } catch (error) {
      expect(String(error)).not.toContain(apiKey)
      expect(String(error)).not.toContain(stored)
    }
  })

  it('reads a 32-byte base64 master key and rejects anything else', () => {
    expect(readMasterKey({ SEF_KEY_ENCRYPTION_KEY: master.toString('base64') } as unknown as NodeJS.ProcessEnv)?.equals(master)).toBe(true)
    expect(readMasterKey({ SEF_KEY_ENCRYPTION_KEY: randomBytes(16).toString('base64') } as unknown as NodeJS.ProcessEnv)).toBeNull()
    expect(readMasterKey({} as unknown as NodeJS.ProcessEnv)).toBeNull()
  })
})
