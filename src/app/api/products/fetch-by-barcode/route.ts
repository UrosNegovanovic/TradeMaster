import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Unified barcode lookup API route
 * 
 * Flow:
 * 1. Check local Prisma database first (user's products)
 * 2. If not found, query external APIs (OpenFoodFacts, UPCitemdb, etc.)
 * 3. Return standardized ProductMetadata object
 * 
 * GET /api/products/fetch-by-barcode?barcode={barcode}
 */

interface ProductMetadata {
  name: string
  description: string
  imageUrl: string | null
  found: boolean
  barcode: string
  source?: 'local' | 'food' | 'beauty' | 'products' // 'local' = from our DB, others = external APIs
  categoryId?: string | null // Only present if found in local DB
}

interface OpenFoodFactsResponse {
  status: number
  product?: {
    product_name?: string
    product_name_en?: string
    generic_name?: string
    brands?: string
    categories?: string
    quantity?: string
    ingredients_text?: string
    image_front_url?: string
    image_url?: string
    image_small_url?: string
  }
}

interface UPCItemDBResponse {
  code: string
  total: number
  items?: Array<{
    title?: string
    brand?: string
    category?: string
    description?: string
    images?: string[]
  }>
}

/**
 * Fetch from OpenFoodFacts (Food & Beverages)
 */
async function fetchFromOpenFoodFacts(barcode: string): Promise<ProductMetadata | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data: OpenFoodFactsResponse = await response.json()
    if (data.status !== 1 || !data.product) return null

    const product = data.product
    const name = product.product_name_en || product.product_name || product.generic_name || ''
    if (!name) return null

    const descriptionParts: string[] = []
    if (product.brands) descriptionParts.push(`Brand: ${product.brands}`)
    if (product.quantity) descriptionParts.push(`Quantity: ${product.quantity}`)
    if (product.categories) descriptionParts.push(`Categories: ${product.categories}`)

    return {
      name: name.trim(),
      description: descriptionParts.join(' | ').trim(),
      imageUrl: product.image_front_url || product.image_url || product.image_small_url || null,
      found: true,
      barcode,
      source: 'food',
    }
  } catch {
    return null
  }
}

/**
 * Fetch from Open Beauty Facts (Cosmetics & Personal Care)
 */
async function fetchFromOpenBeautyFacts(barcode: string): Promise<ProductMetadata | null> {
  try {
    const url = `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data: OpenFoodFactsResponse = await response.json()
    if (data.status !== 1 || !data.product) return null

    const product = data.product
    const name = product.product_name_en || product.product_name || product.generic_name || ''
    if (!name) return null

    const descriptionParts: string[] = []
    if (product.brands) descriptionParts.push(`Brand: ${product.brands}`)
    if (product.categories) descriptionParts.push(`Categories: ${product.categories}`)

    return {
      name: name.trim(),
      description: descriptionParts.join(' | ').trim(),
      imageUrl: product.image_front_url || product.image_url || product.image_small_url || null,
      found: true,
      barcode,
      source: 'beauty',
    }
  } catch {
    return null
  }
}

/**
 * Fetch from Open Products Facts (Household products)
 */
async function fetchFromOpenProductsFacts(barcode: string): Promise<ProductMetadata | null> {
  try {
    const url = `https://world.openproductsfacts.org/api/v2/product/${barcode}.json`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data: OpenFoodFactsResponse = await response.json()
    if (data.status !== 1 || !data.product) return null

    const product = data.product
    const name = product.product_name_en || product.product_name || product.generic_name || ''
    if (!name) return null

    const descriptionParts: string[] = []
    if (product.brands) descriptionParts.push(`Brand: ${product.brands}`)
    if (product.quantity) descriptionParts.push(`Quantity: ${product.quantity}`)
    if (product.categories) descriptionParts.push(`Categories: ${product.categories}`)

    return {
      name: name.trim(),
      description: descriptionParts.join(' | ').trim(),
      imageUrl: product.image_front_url || product.image_url || product.image_small_url || null,
      found: true,
      barcode,
      source: 'products',
    }
  } catch {
    return null
  }
}

/**
 * Fetch from UPCitemdb.com (Global database - 30M+ products)
 */
async function fetchFromUPCItemDB(barcode: string): Promise<ProductMetadata | null> {
  try {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)' },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data: UPCItemDBResponse = await response.json()
    if (data.code !== 'OK' || !data.items || data.items.length === 0) return null

    const product = data.items[0]
    const name = product.title || product.brand || ''
    if (!name) return null

    const descriptionParts: string[] = []
    if (product.brand && product.brand !== name) descriptionParts.push(`Brand: ${product.brand}`)
    if (product.category) descriptionParts.push(`Category: ${product.category}`)
    if (product.description) descriptionParts.push(product.description)

    return {
      name: name.trim(),
      description: descriptionParts.join(' | ').trim(),
      imageUrl: product.images && product.images.length > 0 ? product.images[0] : null,
      found: true,
      barcode,
      source: 'products',
    }
  } catch {
    return null
  }
}

/**
 * GET /api/products/fetch-by-barcode?barcode={barcode}
 * 
 * Unified barcode lookup:
 * 1. Check local database first
 * 2. If not found, query external APIs
 * 3. Return standardized ProductMetadata
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get barcode from query params
    const searchParams = request.nextUrl.searchParams
    const barcode = searchParams.get('barcode')

    if (!barcode || barcode.trim() === '') {
      return NextResponse.json(
        { error: 'Barcode parameter is required' },
        { status: 400 }
      )
    }

    // Clean barcode (remove spaces, non-numeric characters)
    const cleanBarcode = barcode.replace(/\D/g, '')
    
    if (!cleanBarcode || cleanBarcode.length < 8) {
      return NextResponse.json(
        { error: 'Invalid barcode format' },
        { status: 400 }
      )
    }

    console.log(`[Fetch By Barcode] Searching for: ${cleanBarcode}`)

    // ✅ STEP 1: Check local database first
    const localProduct = await prisma.product.findFirst({
      where: {
        profileId: profile.id,
        sku: cleanBarcode,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Most recent entry first
      },
    })

    if (localProduct) {
      console.log(`[Fetch By Barcode] Found in local database`)
      
      // Return local product data in standardized format
      return NextResponse.json({
        name: localProduct.name,
        description: localProduct.description || '',
        imageUrl: localProduct.imageUrl,
        found: true,
        barcode: cleanBarcode,
        source: 'local',
        categoryId: localProduct.categoryId,
      } as ProductMetadata)
    }

    // ✅ STEP 2: Not found locally - query external APIs
    console.log(`[Fetch By Barcode] Not in local DB, querying external APIs...`)

    // Try APIs in parallel for speed
    const [foodResult, beautyResult, productsResult, upcResult] = await Promise.allSettled([
      fetchFromOpenFoodFacts(cleanBarcode),
      fetchFromOpenBeautyFacts(cleanBarcode),
      fetchFromOpenProductsFacts(cleanBarcode),
      fetchFromUPCItemDB(cleanBarcode),
    ])

    // Check results in priority order
    if (foodResult.status === 'fulfilled' && foodResult.value?.found) {
      console.log(`[Fetch By Barcode] Found in OpenFoodFacts`)
      return NextResponse.json(foodResult.value)
    }

    if (beautyResult.status === 'fulfilled' && beautyResult.value?.found) {
      console.log(`[Fetch By Barcode] Found in Open Beauty Facts`)
      return NextResponse.json(beautyResult.value)
    }

    if (productsResult.status === 'fulfilled' && productsResult.value?.found) {
      console.log(`[Fetch By Barcode] Found in Open Products Facts`)
      return NextResponse.json(productsResult.value)
    }

    if (upcResult.status === 'fulfilled' && upcResult.value?.found) {
      console.log(`[Fetch By Barcode] Found in UPCitemdb`)
      return NextResponse.json(upcResult.value)
    }

    // Not found in any database (local or external)
    console.log(`[Fetch By Barcode] Not found in any database`)
    return NextResponse.json({
      name: '',
      description: '',
      imageUrl: null,
      found: false,
      barcode: cleanBarcode,
    } as ProductMetadata)
  } catch (error) {
    console.error('[Fetch By Barcode] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
