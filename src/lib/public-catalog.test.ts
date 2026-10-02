import { describe, expect, it } from 'vitest'
import {
  getSafeCatalogSharePath,
  getSafeEmailHref,
  getSafePhoneHref,
  toPublicCatalog,
} from './public-catalog'
import { DEFAULT_CATALOG_DISPLAY } from './catalog-layout'

describe('public catalog links', () => {
  it('accepts only an internal catalog share path with a 64-character token', () => {
    const token = 'a'.repeat(64)

    expect(getSafeCatalogSharePath(`/shared/catalog/${token}`)).toBe(`/shared/catalog/${token}`)
    expect(getSafeCatalogSharePath('javascript:alert(1)')).toBeNull()
    expect(getSafeCatalogSharePath('//example.com/shared/catalog/' + token)).toBeNull()
    expect(getSafeCatalogSharePath('/shared/catalog/short')).toBeNull()
  })

  it('builds contact links only from allow-listed email and phone characters', () => {
    expect(getSafeEmailHref('prodaja@example.com')).toBe('mailto:prodaja@example.com')
    expect(getSafeEmailHref('javascript:alert(1)')).toBeNull()
    expect(getSafePhoneHref('+381 (11) 123-456')).toBe('tel:+38111123456')
    expect(getSafePhoneHref('javascript:alert(1)')).toBeNull()
  })
})

describe('toPublicCatalog', () => {
  it('keeps offer fields and drops extra tenant/inventory properties', () => {
    const publicCatalog = toPublicCatalog({
      id: 'cat-1',
      name: 'Jesenja ponuda',
      clientName: 'Kafana',
      discount: 10,
      notes: 'Samo za ovog klijenta',
      profile: {
        companyName: 'Veletrgovina',
        contactEmail: 'prodaja@example.com',
        contactPhone: '011',
        address: 'Beograd',
        logoUrl: 'https://cdn.example/logo.png',
      },
      items: [
        {
          id: 'item-1',
          originalPrice: 200,
          discountedPrice: 180,
          sortOrder: 0,
          product: {
            name: 'Kafa',
            sku: '001',
            imageUrl: 'https://cdn.example/kafa.png',
            description: '250g',
            category: { name: 'Napici' },
          },
        },
      ],
    })

    expect(publicCatalog).toEqual({
      id: 'cat-1',
      name: 'Jesenja ponuda',
      clientName: 'Kafana',
      discount: 10,
      notes: 'Samo za ovog klijenta',
      display: DEFAULT_CATALOG_DISPLAY,
      profile: {
        companyName: 'Veletrgovina',
        contactEmail: 'prodaja@example.com',
        contactPhone: '011',
        address: 'Beograd',
        logoUrl: 'https://cdn.example/logo.png',
      },
      items: [
        {
          id: 'item-1',
          originalPrice: 200,
          discountedPrice: 180,
          sortOrder: 0,
          product: {
            name: 'Kafa',
            sku: '001',
            imageUrl: 'https://cdn.example/kafa.png',
            description: '250g',
            categoryName: 'Napici',
          },
        },
      ],
    })
    expect(JSON.stringify(publicCatalog)).not.toMatch(/profileId|quantity|clerk/i)
  })

  it('allows a missing product on an item', () => {
    const publicCatalog = toPublicCatalog({
      id: 'cat-2',
      name: 'Prazan red',
      clientName: null,
      discount: 0,
      notes: null,
      profile: {
        companyName: 'Firma',
        contactEmail: null,
        contactPhone: null,
        address: null,
        logoUrl: null,
      },
      items: [
        {
          id: 'item-missing',
          originalPrice: 1,
          discountedPrice: 1,
          sortOrder: 0,
          product: null,
        },
      ],
    })

    expect(publicCatalog.items[0].product).toBeNull()
  })

  it('passes display settings and drops fields the owner hid', () => {
    const publicCatalog = toPublicCatalog({
      id: 'cat-3',
      name: 'Cenovnik',
      clientName: null,
      discount: 0,
      notes: null,
      layout: 'LIST',
      groupByCategory: true,
      sortMode: 'NAME',
      showSku: false,
      showDescription: false,
      showOriginalPrice: false,
      profile: { companyName: 'Firma', contactEmail: null, contactPhone: null, address: null, logoUrl: null },
      items: [
        {
          id: 'item-1',
          originalPrice: 100,
          discountedPrice: 100,
          sortOrder: 0,
          product: { name: 'Kafa', sku: 'SECRET-SKU', imageUrl: null, description: 'opis', category: null },
        },
      ],
    })

    expect(publicCatalog.display).toEqual({
      layout: 'LIST',
      groupByCategory: true,
      sortMode: 'NAME',
      showSku: false,
      showDescription: false,
      showOriginalPrice: false,
    })
    expect(publicCatalog.items[0].product).toEqual({
      name: 'Kafa',
      sku: null,
      imageUrl: null,
      description: null,
      categoryName: null,
    })
    expect(JSON.stringify(publicCatalog)).not.toContain('SECRET-SKU')
  })
})
