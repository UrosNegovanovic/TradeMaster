import { describe, it, expect } from 'vitest'
import { productSchema, catalogSchema, profileSchema } from './validations'

describe('productSchema', () => {
    it('exposes safeParse', () => {
        const result = productSchema.safeParse({ name: 'Test', sku: 'T-001' })
        expect(result).toHaveProperty('success')
    })
    describe('happy path', () => {
        it('accepts minimal valid object (name and sku)', () => {
            const result = productSchema.safeParse({
                name: 'Proizvod', sku:'SKU-001' })
                expect(result.success).toBe(true)
                if (result.success) {
                    expect(result.data.name).toBe('Proizvod')
                    expect(result.data.sku).toBe('SKU-001')
                }
            })

            it('accepts full valid object (optional fields)', () => {
                const input = {
                    name: 'Proizvod', 
                    sku:'SKU-001', 
                    price: 100, 
                    quantity: 10, 
                    imageUrl: 'https://example.com/image.jpg', 
                    description: 'Opis proizvoda', 
                    categoryId: '123' 
                }
                const result = productSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe(input.name)
      expect(result.data.price).toBe(input.price)
      expect(result.data.quantity).toBe(input.quantity)
      expect(result.data.imageUrl).toBe(input.imageUrl)
    }
  })
})

describe('edge cases', () => {
    it('fails when name is empty', () => {
      const result = productSchema.safeParse({ name: '', sku: 'X' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Name')
      }
    })
  
    it('fails when sku is empty', () => {
      const result = productSchema.safeParse({ name: 'Product', sku: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('SKU')
      }
    })
  
    it('fails when price is negative', () => {
      const result = productSchema.safeParse({ name: 'P', sku: 'S', price: -1 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Price')
      }
    })
  
    it('fails when quantity is less than 1', () => {
      const result = productSchema.safeParse({ name: 'P', sku: 'S', quantity: 0 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Quantity')
      }
    })
  
    it('fails when name exceeds 255 characters', () => {
      const result = productSchema.safeParse({
        name: 'a'.repeat(256),
        sku: 'S',
      })
      expect(result.success).toBe(false)
    })
  
    it('fails when imageUrl is not a valid URL', () => {
      const result = productSchema.safeParse({
        name: 'P',
        sku: 'S',
        imageUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('URL')
      }
    })
  })
  describe('default values', () => {
    it('applies default price 0 and quantity 1 when omitted', () => {
      const result = productSchema.safeParse({ name: 'Product', sku: 'SKU-X' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price).toBe(0)
        expect(result.data.quantity).toBe(1)
      }
    })
  })
})

describe('catalogSchema', () => {
  it('exposes safeParse', () => {
    const result = catalogSchema.safeParse({
      name: 'Catalog',
      discount: 10,
      productIds: ['p1'],
    })
    expect(result).toHaveProperty('success')
  })

  describe('happy path', () => {
    it('accepts minimal valid object (name, discount, productIds)', () => {
      const result = catalogSchema.safeParse({
        name: 'My Catalog',
        discount: 15,
        productIds: ['product-1'],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('My Catalog')
        expect(result.data.discount).toBe(15)
        expect(result.data.productIds).toEqual(['product-1'])
      }
    })

    it('accepts full valid object with optional fields', () => {
      const input = {
        name: 'Full Catalog',
        clientName: 'Client ABC',
        discount: 20,
        notes: 'Some notes',
        productIds: ['p1', 'p2', 'p3'],
      }
      const result = catalogSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe(input.name)
        expect(result.data.clientName).toBe(input.clientName)
        expect(result.data.discount).toBe(input.discount)
        expect(result.data.notes).toBe(input.notes)
        expect(result.data.productIds).toEqual(input.productIds)
      }
    })
  })

  describe('edge cases', () => {
    it('fails when name is empty', () => {
      const result = catalogSchema.safeParse({
        name: '',
        discount: 0,
        productIds: ['p1'],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Name')
      }
    })

    it('fails when discount is less than 0', () => {
      const result = catalogSchema.safeParse({
        name: 'Catalog',
        discount: -1,
        productIds: ['p1'],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Discount')
      }
    })

    it('fails when discount exceeds 100', () => {
      const result = catalogSchema.safeParse({
        name: 'Catalog',
        discount: 101,
        productIds: ['p1'],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Discount')
      }
    })

    it('fails when productIds is empty', () => {
      const result = catalogSchema.safeParse({
        name: 'Catalog',
        discount: 10,
        productIds: [],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('At least one product')
      }
    })

    it('fails when name exceeds 255 characters', () => {
      const result = catalogSchema.safeParse({
        name: 'a'.repeat(256),
        discount: 10,
        productIds: ['p1'],
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('profileSchema', () => {
  it('exposes safeParse', () => {
    const result = profileSchema.safeParse({})
    expect(result).toHaveProperty('success')
  })

  describe('happy path', () => {
    it('accepts empty object (all optional)', () => {
      const result = profileSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.companyName).toBeUndefined()
        expect(result.data.contactEmail).toBeUndefined()
      }
    })

    it('accepts full valid object with optional fields', () => {
      const input = {
        companyName: 'Acme Corp',
        contactEmail: 'user@example.com',
        contactPhone: '+1234567890',
        address: '123 Main St',
        pib: '123456789',
        logoUrl: 'https://example.com/logo.png',
      }
      const result = profileSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.companyName).toBe(input.companyName)
        expect(result.data.contactEmail).toBe(input.contactEmail)
        expect(result.data.contactPhone).toBe(input.contactPhone)
        expect(result.data.address).toBe(input.address)
        expect(result.data.pib).toBe(input.pib)
        expect(result.data.logoUrl).toBe(input.logoUrl)
      }
    })

    it('accepts empty string for contactEmail', () => {
      const result = profileSchema.safeParse({ contactEmail: '' })
      expect(result.success).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('fails when contactEmail is invalid', () => {
      const result = profileSchema.safeParse({
        contactEmail: 'not-an-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Invalid email')
      }
    })

    it('fails when logoUrl is not a valid URL', () => {
      const result = profileSchema.safeParse({
        logoUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const msg = result.error.issues[0]?.message ?? ''
        expect(msg).toContain('Invalid URL')
      }
    })

    it('fails when pib exceeds 50 characters', () => {
      const result = profileSchema.safeParse({
        pib: 'a'.repeat(51),
      })
      expect(result.success).toBe(false)
    })

    it('fails when address exceeds 500 characters', () => {
      const result = profileSchema.safeParse({
        address: 'a'.repeat(501),
      })
      expect(result.success).toBe(false)
    })
  })
})
