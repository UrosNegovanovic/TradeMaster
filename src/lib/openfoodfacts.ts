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
}

/**
 * Fetch product metadata from OpenFoodFacts API
 * @param barcode EAN-13, UPC, or other standard barcode format
 * @returns Product metadata or null if not found
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

    // OpenFoodFacts API endpoint
    const url = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)',
      },
    })

    if (!response.ok) {
      console.warn('OpenFoodFacts API error:', response.status)
      return null
    }

    const data: OpenFoodFactsResponse = await response.json()

    // Check if product was found
    if (data.status !== 1 || !data.product) {
      return {
        name: '',
        description: '',
        imageUrl: null,
        found: false,
        barcode: cleanBarcode,
      }
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
