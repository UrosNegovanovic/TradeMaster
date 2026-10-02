import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const { mockProfileFindUnique, mockProductFindFirst } = vi.hoisted(() => ({
  mockProfileFindUnique: vi.fn(),
  mockProductFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    profile: { findUnique: mockProfileFindUnique },
    product: { findFirst: mockProductFindFirst },
  },
}))

import { auth } from '@clerk/nextjs/server'
import { GET } from './route'

const mockProfile = {
  id: 'profile-1',
  clerkUserId: 'user_test_123',
}

const mockLocalProduct = {
  id: 'product-1',
  name: 'Local Product',
  description: 'From DB',
  imageUrl: 'https://example.com/img.png',
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Category' },
  profileId: 'profile-1',
  sku: '1234567890123',
  price: 10,
  quantity: 5,
  minStock: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/products/fetch-by-barcode', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_123' } as never)
    mockProfileFindUnique.mockResolvedValue(mockProfile)
    mockProductFindFirst.mockResolvedValue(null)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 0 }), { status: 200 })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const request = new NextRequest(
      'http://localhost/api/products/fetch-by-barcode?barcode=1234567890123'
    )
    const response = await GET(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 404 when profile not found', async () => {
    mockProfileFindUnique.mockResolvedValue(null)
    const request = new NextRequest(
      'http://localhost/api/products/fetch-by-barcode?barcode=1234567890123'
    )
    const response = await GET(request)
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json).toHaveProperty('error', 'Profile not found')
  })

  it('returns 400 when barcode param is missing', async () => {
    const request = new NextRequest(
      'http://localhost/api/products/fetch-by-barcode'
    )
    const response = await GET(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json).toHaveProperty('error', 'Barcode parameter is required')
  })

  it('returns 400 when barcode format is invalid (too short)', async () => {
    const request = new NextRequest(
      'http://localhost/api/products/fetch-by-barcode?barcode=123'
    )
    const response = await GET(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json).toHaveProperty('error', 'Invalid barcode format')
  })

  it('returns local product when found in database', async () => {
    mockProductFindFirst.mockResolvedValue(mockLocalProduct)
    const request = new NextRequest(
      'http://localhost/api/products/fetch-by-barcode?barcode=1234567890123'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toMatchObject({
      name: 'Local Product',
      found: true,
      barcode: '1234567890123',
      source: 'local',
    })
  })

  it('returns found: false when not in local DB and external APIs return nothing', async () => {
    const request = new NextRequest(
      'http://localhost/api/products/fetch-by-barcode?barcode=1234567890123'
    )
    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toMatchObject({
      found: false,
      barcode: '1234567890123',
      name: '',
      description: '',
      imageUrl: null,
    })
  })
})
