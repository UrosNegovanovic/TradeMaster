/**
 * OpenFoodFacts API Integration
 * Fetches product metadata from the world's largest open food products database
 */

export interface OpenFoodFactsProduct {
  product_name?: string
  product_name_en?: string
  brands?: string
  image_url?: string
  image_front_url?: string
  image_small_url?: string
  generic_name?: string
  ingredients_text?: string
  quantity?: string
  categories?: string
}

export interface OpenFoodFactsResponse {
  status: number
  code: string
  product?: OpenFoodFactsProduct
}

export interface ProductMetadata {
  name: string
  description: string
  imageUrl: string | null
  found: boolean
  barcode: string
  source?: 'food' | 'beauty' | 'products' // Which API found the product
}

/**
 * Fetch product metadata from OpenFoodFacts API (Food & Beverages)
 * @param cleanBarcode Cleaned barcode (numeric only)
 * @returns Product metadata or null if not found
 */
async function fetchFromOpenFoodFacts(
  cleanBarcode: string
): Promise<ProductMetadata | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return null
    }

    const data: OpenFoodFactsResponse = await response.json()

    // Check if product was found
    if (data.status !== 1 || !data.product) {
      return null
    }

    const product = data.product

    // Extract product name (prioritize English name, then generic name)
    const name =
      product.product_name_en ||
      product.product_name ||
      product.generic_name ||
      ''

    // Build description from available data
    const descriptionParts: string[] = []
    
    if (product.brands) {
      descriptionParts.push(`Brand: ${product.brands}`)
    }
    
    if (product.quantity) {
      descriptionParts.push(`Quantity: ${product.quantity}`)
    }
    
    if (product.categories) {
      descriptionParts.push(`Categories: ${product.categories}`)
    }
    
    if (product.ingredients_text && product.ingredients_text.length < 500) {
      descriptionParts.push(`Ingredients: ${product.ingredients_text}`)
    }

    const description = descriptionParts.join(' | ')

    // Extract best quality image URL
    const imageUrl =
      product.image_front_url ||
      product.image_url ||
      product.image_small_url ||
      null

    return {
      name: name.trim(),
      description: description.trim(),
      imageUrl,
      found: true,
      barcode: cleanBarcode,
      source: 'food',
    }
  } catch (error) {
    // Timeout or network error
    return null
  }
}

/**
 * Fetch product metadata from Open Beauty Facts API (Cosmetics & Personal Care)
 * @param cleanBarcode Cleaned barcode (numeric only)
 * @returns Product metadata or null if not found
 */
async function fetchFromOpenBeautyFacts(
  cleanBarcode: string
): Promise<ProductMetadata | null> {
  try {
    const url = `https://world.openbeautyfacts.org/api/v2/product/${cleanBarcode}.json`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return null
    }

    const data: OpenFoodFactsResponse = await response.json()

    // Check if product was found
    if (data.status !== 1 || !data.product) {
      return null
    }

    const product = data.product

    // Extract product name
    const name =
      product.product_name_en ||
      product.product_name ||
      product.generic_name ||
      ''

    // Build description for cosmetics
    const descriptionParts: string[] = []
    
    if (product.brands) {
      descriptionParts.push(`Brand: ${product.brands}`)
    }
    
    if (product.quantity) {
      descriptionParts.push(`Quantity: ${product.quantity}`)
    }
    
    if (product.categories) {
      descriptionParts.push(`Type: ${product.categories}`)
    }
    
    if (product.ingredients_text && product.ingredients_text.length < 500) {
      descriptionParts.push(`Ingredients: ${product.ingredients_text}`)
    }

    const description = descriptionParts.join(' | ')

    // Extract best quality image URL
    const imageUrl =
      product.image_front_url ||
      product.image_url ||
      product.image_small_url ||
      null

    return {
      name: name.trim(),
      description: description.trim(),
      imageUrl,
      found: true,
      barcode: cleanBarcode,
      source: 'beauty',
    }
  } catch (error) {
    // Timeout or network error
    return null
  }
}

/**
 * Fetch product metadata from Open Products Facts API (Household products, etc.)
 * @param cleanBarcode Cleaned barcode (numeric only)
 * @returns Product metadata or null if not found
 */
async function fetchFromOpenProductsFacts(
  cleanBarcode: string
): Promise<ProductMetadata | null> {
  try {
    const url = `https://world.openproductsfacts.org/api/v2/product/${cleanBarcode}.json`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return null
    }

    const data: OpenFoodFactsResponse = await response.json()

    // Check if product was found
    if (data.status !== 1 || !data.product) {
      return null
    }

    const product = data.product

    // Extract product name
    const name =
      product.product_name_en ||
      product.product_name ||
      product.generic_name ||
      ''

    // Build description for general products
    const descriptionParts: string[] = []
    
    if (product.brands) {
      descriptionParts.push(`Brand: ${product.brands}`)
    }
    
    if (product.quantity) {
      descriptionParts.push(`Quantity: ${product.quantity}`)
    }
    
    if (product.categories) {
      descriptionParts.push(`Categories: ${product.categories}`)
    }

    const description = descriptionParts.join(' | ')

    // Extract best quality image URL
    const imageUrl =
      product.image_front_url ||
      product.image_url ||
      product.image_small_url ||
      null

    return {
      name: name.trim(),
      description: description.trim(),
      imageUrl,
      found: true,
      barcode: cleanBarcode,
      source: 'products',
    }
  } catch (error) {
    // Timeout or network error
    return null
  }
}

/**
 * Fetch product metadata with multi-API fallback strategy
 * Tries: OpenFoodFacts → Open Beauty Facts → Open Products Facts
 * @param barcode EAN-13, UPC, or other standard barcode format
 * @returns Product metadata or null if not found in any database
 */
export async function fetchProductMetadata(
  barcode: string
): Promise<ProductMetadata | null> {
  try {
    // Clean barcode (remove spaces, non-numeric characters)
    const cleanBarcode = barcode.replace(/\D/g, '')
    
    if (!cleanBarcode || cleanBarcode.length < 8) {
      console.warn('Invalid barcode format:', barcode)
      return null
    }

    console.log(`🔍 Searching for barcode: ${cleanBarcode}`)

    // FALLBACK STRATEGY - Try APIs in order:
    
    // 1. Try OpenFoodFacts first (Food & Beverages)
    console.log('📦 Trying OpenFoodFacts (Food)...')
    let result = await fetchFromOpenFoodFacts(cleanBarcode)
    if (result?.found) {
      console.log('✅ Found in OpenFoodFacts!')
      return result
    }
    
    // 2. Try Open Beauty Facts (Cosmetics & Personal Care)
    console.log('💄 Trying Open Beauty Facts (Cosmetics)...')
    result = await fetchFromOpenBeautyFacts(cleanBarcode)
    if (result?.found) {
      console.log('✅ Found in Open Beauty Facts!')
      return result
    }
    
    // 3. Try Open Products Facts (Household products, etc.)
    console.log('🧴 Trying Open Products Facts (Household)...')
    result = await fetchFromOpenProductsFacts(cleanBarcode)
    if (result?.found) {
      console.log('✅ Found in Open Products Facts!')
      return result
    }

    // Not found in any database
    console.log('❌ Product not found in any database')
    return {
      name: '',
      description: '',
      imageUrl: null,
      found: false,
      barcode: cleanBarcode,
    }
  } catch (error) {
    console.error('Error fetching product metadata:', error)
    return null
  }
}

/**
 * Validate barcode format
 * @param barcode Raw barcode string
 * @returns true if barcode format is valid
 */
export function isValidBarcode(barcode: string): boolean {
  // If barcode is empty or too short, reject
  if (!barcode || barcode.trim().length < 3) {
    return false
  }
  
  const cleanBarcode = barcode.replace(/\D/g, '')
  
  // Accept if it's a standard numeric barcode with valid length
  // EAN-8 (8), UPC-A (12), EAN-13 (13), ITF-14 (14)
  const standardLengths = [8, 12, 13, 14]
  if (standardLengths.includes(cleanBarcode.length)) {
    return true
  }
  
  // Accept CODE-128, CODE-39, ITF barcodes (variable length, may contain letters)
  // These can be 4-50 characters (numeric or alphanumeric)
  // If ZXing successfully decoded it, it's valid!
  if (barcode.length >= 4 && barcode.length <= 50) {
    return true
  }
  
  return false
}
