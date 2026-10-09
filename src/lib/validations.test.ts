import { describe, it, expect } from 'vitest'
import { productSchema, catalogSchema, profileSchema } from './validations'
import { pibProblem } from './company-fields'
import { normalizeGiroAccount } from './giro-account'

const firstMessage = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  result.success ? '' : result.error?.issues[0]?.message ?? ''

/** Fake but valid company numbers, generated with the app's own control-digit checks. */
function validPib(): string {
  for (let digit = 0; digit <= 9; digit++) if (!pibProblem(`10000000${digit}`)) return `10000000${digit}`
  throw new Error('no valid PIB')
}
function validGiro(): string {
  for (let control = 0; control <= 99; control++) {
    const account = `160-0000000000001-${String(control).padStart(2, '0')}`
    if (normalizeGiroAccount(account)) return account
  }
  throw new Error('no valid žiro-račun')
}

describe('productSchema (ProductForm: purchase price required)', () => {
  const minimal = { name: 'Proizvod', sku: 'SKU-001', costPrice: 80 }

  describe('happy path', () => {
    it('accepts name, SKU and purchase price', () => {
      const result = productSchema.safeParse(minimal)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Proizvod')
        expect(result.data.sku).toBe('SKU-001')
        expect(result.data.costPrice).toBe(80)
      }
    })

    it('accepts all optional fields', () => {
      const input = {
        ...minimal,
        price: 100,
        quantity: 10,
        minStock: 5,
        imageUrl: 'https://example.com/image.jpg',
        description: 'Opis proizvoda',
        categoryId: '123',
      }
      const result = productSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price).toBe(100)
        expect(result.data.quantity).toBe(10)
        expect(result.data.minStock).toBe(5)
        expect(result.data.imageUrl).toBe(input.imageUrl)
      }
    })

    it('defaults the sale price to 0 and the quantity to 1', () => {
      const result = productSchema.safeParse(minimal)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price).toBe(0)
        expect(result.data.quantity).toBe(1)
      }
    })
  })

  describe('edge cases (Serbian messages)', () => {
    it('requires the purchase price', () => {
      expect(firstMessage(productSchema.safeParse({ name: 'P', sku: 'S' }))).toBe('Nabavna cena je obavezna')
    })

    it('fails when name is empty', () => {
      expect(firstMessage(productSchema.safeParse({ ...minimal, name: '' }))).toBe('Naziv je obavezan')
    })

    it('fails when sku is empty', () => {
      expect(firstMessage(productSchema.safeParse({ ...minimal, sku: '' }))).toBe('SKU je obavezan')
    })

    it('fails when the sale price is negative', () => {
      expect(firstMessage(productSchema.safeParse({ ...minimal, price: -1 }))).toBe('Cena ne može biti negativna')
    })

    it('fails when quantity is less than 1', () => {
      expect(firstMessage(productSchema.safeParse({ ...minimal, quantity: 0 }))).toBe('Količina mora biti najmanje 1')
    })

    it('fails when name exceeds 255 characters', () => {
      expect(productSchema.safeParse({ ...minimal, name: 'a'.repeat(256) }).success).toBe(false)
    })

    it('fails when imageUrl is not a valid URL', () => {
      expect(firstMessage(productSchema.safeParse({ ...minimal, imageUrl: 'not-a-url' }))).toBe('Adresa slike nije ispravna')
    })
  })
})

describe('catalogSchema', () => {
  describe('happy path', () => {
    it('accepts name, discount and products, with display defaults', () => {
      const result = catalogSchema.safeParse({ name: 'Moj katalog', discount: 15, productIds: ['product-1'] })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.discount).toBe(15)
        expect(result.data.productIds).toEqual(['product-1'])
        expect(result.data.layout).toBe('GRID_4')
        expect(result.data.sortMode).toBe('MANUAL')
      }
    })

    it('accepts optional fields and keeps the product order', () => {
      const input = {
        name: 'Ceo katalog',
        clientName: 'Kupac DOO',
        discount: 20,
        notes: 'Napomena',
        productIds: ['p3', 'p1', 'p2'],
        layout: 'LIST' as const,
      }
      const result = catalogSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.clientName).toBe('Kupac DOO')
        expect(result.data.notes).toBe('Napomena')
        expect(result.data.productIds).toEqual(['p3', 'p1', 'p2'])
        expect(result.data.layout).toBe('LIST')
      }
    })
  })

  describe('edge cases (Serbian messages)', () => {
    const base = { name: 'Katalog', discount: 10, productIds: ['p1'] }

    it('fails when name is empty', () => {
      expect(firstMessage(catalogSchema.safeParse({ ...base, name: '' }))).toBe('Unesite naziv kataloga')
    })

    it('fails when discount is below 0 or above 100', () => {
      expect(firstMessage(catalogSchema.safeParse({ ...base, discount: -1 }))).toBe('Popust ne može biti manji od 0')
      expect(firstMessage(catalogSchema.safeParse({ ...base, discount: 101 }))).toBe('Popust ne može biti veći od 100%')
    })

    it('fails without products or with the same product twice', () => {
      expect(firstMessage(catalogSchema.safeParse({ ...base, productIds: [] }))).toBe('Izaberite bar jedan proizvod')
      expect(firstMessage(catalogSchema.safeParse({ ...base, productIds: ['p1', 'p1'] }))).toBe(
        'Isti proizvod je izabran dva puta'
      )
    })

    it('fails when name exceeds 255 characters', () => {
      expect(catalogSchema.safeParse({ ...base, name: 'a'.repeat(256) }).success).toBe(false)
    })

    it('refuses an unknown layout', () => {
      expect(catalogSchema.safeParse({ ...base, layout: 'POSTER' }).success).toBe(false)
    })
  })
})

describe('profileSchema (Podešavanja: SEF-ready company data required)', () => {
  const company = {
    companyName: 'Test Veleprodaja DOO',
    address: 'Knez Mihailova 1, 11000 Beograd',
    pib: validPib(),
    registrationNumber: '12345678',
    giroAccount: validGiro(),
  }

  describe('happy path', () => {
    it('accepts the required company data', () => {
      expect(profileSchema.safeParse(company).success).toBe(true)
    })

    it('accepts optional contact data and logo', () => {
      const input = {
        ...company,
        contactEmail: 'kontakt@firma.rs',
        contactPhone: '+381 11 123 456',
        inVatSystem: true,
        logoUrl: 'https://example.com/logo.png',
      }
      const result = profileSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contactEmail).toBe(input.contactEmail)
        expect(result.data.logoUrl).toBe(input.logoUrl)
      }
    })

    it('accepts an empty contact email', () => {
      expect(profileSchema.safeParse({ ...company, contactEmail: '' }).success).toBe(true)
    })
  })

  describe('edge cases (Serbian messages)', () => {
    it('refuses an empty form with the first missing field named', () => {
      expect(profileSchema.safeParse({}).success).toBe(false)
    })

    it('fails when contactEmail is invalid', () => {
      expect(firstMessage(profileSchema.safeParse({ ...company, contactEmail: 'not-an-email' }))).toBe('Email nije ispravan.')
    })

    it('fails when logoUrl is not a valid URL', () => {
      expect(firstMessage(profileSchema.safeParse({ ...company, logoUrl: 'not-a-url' }))).toBe('Adresa logotipa nije ispravna.')
    })

    it('fails for a PIB with a wrong control digit, an address without city, a short MB', () => {
      const wrongPib = company.pib.slice(0, 8) + String((Number(company.pib[8]) + 1) % 10)
      expect(profileSchema.safeParse({ ...company, pib: wrongPib }).success).toBe(false)
      expect(profileSchema.safeParse({ ...company, address: 'Knez Mihailova 1' }).success).toBe(false)
      expect(profileSchema.safeParse({ ...company, registrationNumber: '1234' }).success).toBe(false)
    })

    it('fails when address exceeds 500 characters', () => {
      expect(profileSchema.safeParse({ ...company, address: `${'a'.repeat(490)}, 11000 Beograd` }).success).toBe(false)
    })
  })
})
