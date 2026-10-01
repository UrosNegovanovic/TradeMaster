import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

const MAX_REDIRECTS = 3

const blockedV4 = new BlockList()
blockedV4.addSubnet('0.0.0.0', 8, 'ipv4')
blockedV4.addSubnet('10.0.0.0', 8, 'ipv4')
blockedV4.addSubnet('127.0.0.0', 8, 'ipv4')
blockedV4.addSubnet('169.254.0.0', 16, 'ipv4')
blockedV4.addSubnet('172.16.0.0', 12, 'ipv4')
blockedV4.addSubnet('192.168.0.0', 16, 'ipv4')

const blockedV6 = new BlockList()
blockedV6.addAddress('::', 'ipv6')
blockedV6.addAddress('::1', 'ipv6')
blockedV6.addAddress('fd00:ec2::254', 'ipv6')
blockedV6.addSubnet('fc00::', 7, 'ipv6')
blockedV6.addSubnet('fe80::', 10, 'ipv6')

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
])

function hostnameIsBlockedName(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '').toLowerCase()
  if (BLOCKED_HOSTS.has(host)) return true
  return host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')
}

function ipv4FromMapped(ip: string): string | null {
  const match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  return match?.[1] ?? null
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) return blockedV4.check(ip, 'ipv4')
  if (version === 6) {
    if (blockedV6.check(ip, 'ipv6')) return true
    const mapped = ipv4FromMapped(ip)
    return mapped ? blockedV4.check(mapped, 'ipv4') : false
  }
  return true
}

export async function assertSafePublicHttpUrl(raw: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('Invalid URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('URL protocol is not allowed')
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL credentials are not allowed')
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '')
  if (!hostname || hostnameIsBlockedName(hostname)) {
    throw new Error('URL host is not allowed')
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('URL host is not allowed')
    return parsed
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true })
  if (!addresses.length) throw new Error('URL host could not be resolved')
  for (const { address } of addresses) {
    if (isBlockedIp(address)) throw new Error('URL host is not allowed')
  }
  return parsed
}

export async function isSafePublicHttpUrl(raw: string): Promise<boolean> {
  try {
    await assertSafePublicHttpUrl(raw)
    return true
  } catch {
    return false
  }
}

function redirectTarget(current: string, location: string | null): string | null {
  if (!location) return null
  try {
    return new URL(location, current).toString()
  } catch {
    return null
  }
}

/** Fetch an http(s) URL after blocking private/link-local/metadata hosts, without following redirects blindly. */
export async function fetchPublicHttpUrl(
  raw: string,
  init: RequestInit = {},
  maxRedirects = MAX_REDIRECTS
): Promise<Response> {
  let current = raw
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafePublicHttpUrl(current)
    const response = await fetch(current, { ...init, redirect: 'manual' })
    if (response.status >= 300 && response.status < 400) {
      const next = redirectTarget(current, response.headers.get('location'))
      if (!next) throw new Error('Redirect without a valid Location')
      current = next
      continue
    }
    return response
  }
  throw new Error('Too many redirects')
}
