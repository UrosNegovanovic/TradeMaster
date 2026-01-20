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
 * Fetch product metadata from UPCitemdb.com (Global product database)
 * FREE service with 100 req/day (no key) or 10,000 req/day (with free key)
 * 30M+ products including European brands
 * @param cleanBarcode Cleaned barcode (numeric only)
 * @returns Product metadata or null if not found
 */
async function fetchFromUPCItemDB(
  cleanBarcode: string
): Promise<ProductMetadata | null> {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:ENTRY',message:'UPCitemdb API call started',data:{barcode:cleanBarcode},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
  // #endregion
  try {
    // UPCitemdb.com API endpoint - truly free (no API key needed for basic usage)
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanBarcode}`
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:FETCH',message:'Fetching from UPCitemdb',data:{url:url},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TradeMaster/1.0.0 (Inventory Management)',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:RESPONSE',message:'UPCitemdb response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:NOT_OK',message:'UPCitemdb response not OK',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
      // #endregion
      return null
    }

    const data = await response.json()

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:JSON',message:'UPCitemdb JSON parsed',data:{code:data.code,total:data.total,itemsLength:data.items?.length,firstItem:data.items?.[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion

    // UPCitemdb response format: { code: "OK", total: 1, items: [...] }
    if (data.code !== 'OK' || !data.items || data.items.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:NO_DATA',message:'UPCitemdb no product found',data:{code:data.code,total:data.total},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
      // #endregion
      return null
    }

    const product = data.items[0]

    // Extract product name (title is the main field)
    const name = product.title || product.brand || ''
    
    if (!name) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:NO_NAME',message:'UPCitemdb product has no name',data:{product:product},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
      // #endregion
      return null
    }

    // Build description from available data
    const descriptionParts: string[] = []
    
    if (product.brand && product.brand !== name) {
      descriptionParts.push(`Brand: ${product.brand}`)
    }
    
    if (product.category) {
      descriptionParts.push(`Category: ${product.category}`)
    }
    
    if (product.description) {
      descriptionParts.push(product.description)
    }

    const description = descriptionParts.join(' | ')

    // Extract image URL (UPCitemdb provides images array)
    const imageUrl = product.images && product.images.length > 0 
      ? product.images[0] 
      : null

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:SUCCESS',message:'UPCitemdb product found',data:{name:name,description:description,hasImage:!!imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion

    return {
      name: name.trim(),
      description: description.trim(),
      imageUrl,
      found: true,
      barcode: cleanBarcode,
      source: 'products', // Mark as 'products' since it's a general database
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchFromUPCItemDB:ERROR',message:'UPCitemdb error/timeout',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'FIX'})}).catch(()=>{});
    // #endregion
    // Timeout or network error
    return null
  }
}

/**
 * Fetch product metadata via server-side API route (prevents CORS issues)
 * Server route handles multi-API fallback strategy internally
 * @param barcode EAN-13, UPC, or other standard barcode format
 * @returns Product metadata or null if not found in any database
 */
export async function fetchProductMetadata(
  barcode: string
): Promise<ProductMetadata | null> {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchProductMetadata:ENTRY',message:'Server-side API call started',data:{rawBarcode:barcode,barcodeLength:barcode.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'CORS_FIX'})}).catch(()=>{});
  // #endregion
  
  try {
    // Clean barcode (remove spaces, non-numeric characters)
    const cleanBarcode = barcode.replace(/\D/g, '')
    
    if (!cleanBarcode || cleanBarcode.length < 8) {
      console.warn('Invalid barcode format:', barcode)
      return null
    }

    console.log(`🔍 Searching for barcode via API: ${cleanBarcode}`)

    // Call server-side API route (no CORS issues!)
    const apiUrl = `/api/products/barcode?code=${encodeURIComponent(cleanBarcode)}`
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchProductMetadata:API_CALL',message:'Calling server API route',data:{apiUrl:apiUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'CORS_FIX'})}).catch(()=>{});
    // #endregion
    
    const startTime = Date.now()
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchProductMetadata:API_RESPONSE',message:'Server API response received',data:{status:response.status,ok:response.ok,duration:Date.now()-startTime},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'CORS_FIX'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      console.error('API route error:', response.status, response.statusText)
      return null
    }

    const result: ProductMetadata = await response.json()
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchProductMetadata:SUCCESS',message:'Product metadata received',data:{found:result.found,name:result.name,source:result.source,hasImage:!!result.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'CORS_FIX'})}).catch(()=>{});
    // #endregion

    if (result.found) {
      console.log(`✅ Product found! Source: ${result.source}`)
    } else {
      console.log('❌ Product not found in any database')
    }

    return result
  } catch (error) {
    console.error('Error fetching product metadata:', error)
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/9a40dcb9-3c6c-4a7c-a402-9175d311199d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openfoodfacts.ts:fetchProductMetadata:ERROR',message:'Top-level error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-v2',hypothesisId:'CORS_FIX'})}).catch(()=>{});
    // #endregion
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
