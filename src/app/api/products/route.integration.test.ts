import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

const {
  mockProfileFindUnique,
  mockProductFindMany,
  mockProductFindFirst,
  mockProductCreate,
  mockProductUpdate,
} = vi.hoisted(() => ({
  mockProfileFindUnique: vi.fn(),
  mockProductFindMany: vi.fn(),
  mockProductFindFirst: vi.fn(),
  mockProductCreate: vi.fn(),
  mockProductUpdate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    profile: { findUnique: mockProfileFindUnique },
    product: {
      findMany: mockProductFindMany,
      findFirst: mockProductFindFirst,
      create: mockProductCreate,
      update: mockProductUpdate,
    },
  },
}))

import { auth } from '@clerk/nextjs/server'
import { GET, POST } from './route'

const mockProfile = {
  id: 'profile-1',
  clerkUserId: 'user_test_123',
  companyName: null,
  contactEmail: null,
  contactPhone: null,
  address: null,
  pib: null,
  logoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockProduct = {
  id: 'product-1',
  name: 'Product A',
  sku: 'SKU-001',
  price: 10,
  quantity: 5,
  description: null,
  imageUrl: null,
  minStock: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  profileId: 'profile-1',
  categoryId: null,
  category: null,
}

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_123' } as never)
    mockProfileFindUnique.mockResolvedValue(mockProfile)
    mockProductFindMany.mockResolvedValue([mockProduct])
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const response = await GET()
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json).toHaveProperty('error', 'Unauthorized')
  })

  it('returns 404 when profile not found', async () => {
    mockProfileFindUnique.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json).toHaveProperty('error', 'Profile not found')
  })

  it('returns products when authorized', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const products = await response.json()
    expect(Array.isArray(products)).toBe(true)
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      id: 'product-1',
      name: 'Product A',
      sku: 'SKU-001',
      price: 10,
      quantity: 5,
    })
  })
})

describe('POST /api/products', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_test_123' } as never)
    mockProfileFindUnique.mockResolvedValue(mockProfile)
    mockProductFindFirst.mockResolvedValue(null)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never)
    const request = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Product', sku: 'SKU-001' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 when validation fails (missing name)', async () => {
    const request = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: '', sku: 'SKU-001' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json).toHaveProperty('error', 'Validation error')
  })

  it('creates product and returns 201 when valid body', async () => {
    const createdProduct = {
      ...mockProduct,
      id: 'product-new',
      name: 'New Product',
      sku: 'SKU-NEW',
      quantity: 1,
    }
    mockProductCreate.mockResolvedValue(createdProduct)

    const request = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Product', sku: 'SKU-NEW' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json).toHaveProperty('action', 'created')
    expect(json).toMatchObject({
      name: 'New Product',
      sku: 'SKU-NEW',
      quantity: 1,
    })
  })
})
