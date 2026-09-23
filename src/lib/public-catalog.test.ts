import { describe, expect, it } from 'vitest'
import { toPublicCatalog } from './public-catalog'

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
})
