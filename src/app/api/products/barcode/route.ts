import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering (required for searchParams usage)
export const dynamic = 'force-dynamic'

/**
 * Server-side API route for barcode lookup
 * Prevents CORS issues by proxying external API calls through Next.js server
 */

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

interface ProductMetadata {
  name: string
  description: string
  imageUrl: string | null
  found: boolean
  barcode: string
  source?: 'food' | 'beauty' | 'products'
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
 * GET /api/products/barcode?code={barcode}
 * Server-side barcode lookup with multi-API fallback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const barcode = searchParams.get('code')

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode parameter is required' },
        { status: 400 }
      )
    }

    // Clean barcode
    const cleanBarcode = barcode.replace(/\D/g, '')
    if (!cleanBarcode || cleanBarcode.length < 8) {
      return NextResponse.json(
        { error: 'Invalid barcode format' },
        { status: 400 }
      )
    }

    console.log(`[Barcode API] Searching for: ${cleanBarcode}`)

    // Try APIs in order (with parallel execution for speed)
    const [foodResult, beautyResult, productsResult, upcResult] = await Promise.allSettled([
      fetchFromOpenFoodFacts(cleanBarcode),
      fetchFromOpenBeautyFacts(cleanBarcode),
      fetchFromOpenProductsFacts(cleanBarcode),
      fetchFromUPCItemDB(cleanBarcode),
    ])

    // Check results in priority order
    if (foodResult.status === 'fulfilled' && foodResult.value?.found) {
      console.log(`[Barcode API] Found in OpenFoodFacts`)
      return NextResponse.json(foodResult.value)
    }

    if (beautyResult.status === 'fulfilled' && beautyResult.value?.found) {
      console.log(`[Barcode API] Found in Open Beauty Facts`)
      return NextResponse.json(beautyResult.value)
    }

    if (productsResult.status === 'fulfilled' && productsResult.value?.found) {
      console.log(`[Barcode API] Found in Open Products Facts`)
      return NextResponse.json(productsResult.value)
    }

    if (upcResult.status === 'fulfilled' && upcResult.value?.found) {
      console.log(`[Barcode API] Found in UPCitemdb`)
      return NextResponse.json(upcResult.value)
    }

    // Not found in any database
    console.log(`[Barcode API] Not found in any database`)
    return NextResponse.json({
      name: '',
      description: '',
      imageUrl: null,
      found: false,
      barcode: cleanBarcode,
    })
  } catch (error) {
    console.error('[Barcode API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
