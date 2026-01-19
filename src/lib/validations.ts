import { z } from 'zod'

// Product validations
export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sku: z.string().min(1, 'SKU is required').max(100),
  price: z.number().positive('Price must be positive'),
  imageUrl: z
    .union([
      z.string().url('Invalid URL'),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .nullable(),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>

// Catalog validations
export const catalogSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  clientName: z.string().max(255).optional().nullable(),
  discount: z.number().min(0, 'Discount must be at least 0').max(100, 'Discount cannot exceed 100'),
  notes: z.string().max(1000).optional().nullable(),
  productIds: z.array(z.string()).min(1, 'At least one product is required'),
})

export type CatalogFormData = z.infer<typeof catalogSchema>

// Profile validations
export const profileSchema = z.object({
  companyName: z.string().max(255).optional().nullable(),
  contactEmail: z
    .string()
    .email('Invalid email')
    .optional()
    .nullable()
    .or(z.literal('')),
  contactPhone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  pib: z.string().max(50).optional().nullable(),
  logoUrl: z
    .union([
      z.string().url('Invalid URL'),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .nullable(),
})

export type ProfileFormData = z.infer<typeof profileSchema>
