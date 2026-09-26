import { z } from 'zod'

export const invoiceStatusSchema = z.enum(['DRAFT', 'PAID', 'UNPAID'])

const MONEY_INPUT_PATTERN = /^-?\d+(\.\d{1,2})?$/
const QUANTITY_MIN = 1
const QUANTITY_MAX = 2147483647
const UNIT_PRICE_MIN = 0
const MONEY_MAX = 99999999.99
const DISCOUNT_MIN = 0
const DISCOUNT_MAX = 100

function normalizeMoneyInput(value: number | string): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null
    }
    return String(value)
  }

  const trimmed = value.trim()
  return MONEY_INPUT_PATTERN.test(trimmed) || /^-?\d+\.\d+$/.test(trimmed) ? trimmed : null
}

function assertMoneyInput(
  value: number | string,
  ctx: z.RefinementCtx,
  field: 'unitPrice' | 'discount',
  min: number,
  max: number
) {
  const text = normalizeMoneyInput(value)
  if (!text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} must be a valid decimal`,
    })
    return
  }

  if (!MONEY_INPUT_PATTERN.test(text)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} cannot have more than 2 decimal places`,
    })
    return
  }

  const amount = Number(text)
  if (field === 'unitPrice' && amount < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'unitPrice must be greater than or equal to 0',
    })
  }
  if (amount < min || amount > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${field} is outside the supported range`,
    })
  }
}

const unitPriceSchema = z
  .union([z.number(), z.string()])
  .superRefine((value, ctx) => {
    assertMoneyInput(value, ctx, 'unitPrice', UNIT_PRICE_MIN, MONEY_MAX)
  })

const discountSchema = z
  .union([z.number(), z.string()])
  .optional()
  .superRefine((value, ctx) => {
    if (value === undefined) {
      return
    }
    assertMoneyInput(value, ctx, 'discount', DISCOUNT_MIN, DISCOUNT_MAX)
  })
  .transform((value) => (value === undefined ? 0 : value))

const dueDateSchema = z.string().min(1, 'dueDate is required').superRefine((value, ctx) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dueDate must be a valid date',
    })
  }
})

export const invoiceItemWriteSchema = z.object({
  productId: z.string().min(1, 'productId must be a non-empty string').nullable().optional(),
  productName: z.string().trim().min(1, 'productName is required').max(255),
  quantity: z
    .number({ invalid_type_error: 'quantity must be a number' })
    .int('quantity must be an integer')
    .gte(QUANTITY_MIN, 'quantity must be a positive integer')
    .lte(QUANTITY_MAX, 'quantity is outside the supported range'),
  unitPrice: unitPriceSchema,
  discount: discountSchema,
})

export const invoiceWriteSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'invoiceNumber is required').max(255),
  dueDate: dueDateSchema,
  clientName: z.string().trim().min(1, 'clientName is required').max(255),
  clientAddress: z.string().max(500).nullable().optional(),
  status: invoiceStatusSchema.optional(),
  items: z.array(invoiceItemWriteSchema).min(1, 'Invoice must have at least one item'),
})

export const invoiceCreateSchema = invoiceWriteSchema.omit({ invoiceNumber: true })

export const invoicePatchSchema = z
  .object({
    status: invoiceStatusSchema.optional(),
    invoiceNumber: z.string().trim().min(1, 'invoiceNumber is required').max(255).optional(),
    dueDate: dueDateSchema.optional(),
    clientName: z.string().trim().min(1, 'clientName is required').max(255).optional(),
    clientAddress: z.string().max(500).nullable().optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.invoiceNumber !== undefined ||
      value.dueDate !== undefined ||
      value.clientName !== undefined ||
      value.clientAddress !== undefined,
    { message: 'At least one supported field is required' }
  )

export type InvoiceWriteInput = z.infer<typeof invoiceWriteSchema>
export type InvoiceCreateWriteInput = z.infer<typeof invoiceCreateSchema>
export type InvoicePatchInput = z.infer<typeof invoicePatchSchema>

// Product validations
export const productSchema = z.object({
  name: z.string().min(1, 'Naziv je obavezan').max(255, 'Naziv je predugačak'),
  sku: z.string().min(1, 'SKU je obavezan').max(100, 'SKU je predugačak'),
  price: z.number().positive('Cena mora biti veća od 0'),
  costPrice: z
    .number({ invalid_type_error: 'Nabavna cena mora biti broj' })
    .min(0, 'Nabavna cena ne može biti negativna')
    .max(99999999.99, 'Nabavna cena je van podržanog opsega')
    .refine((value) => Number.isInteger(value * 100), 'Nabavna cena može imati najviše 2 decimale')
    .nullable()
    .optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1), // ✅ For warehouse mode scanning
  imageUrl: z
    .union([
      z.string().url('Adresa slike nije ispravna'),
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
  pib: z.string().trim().regex(/^\d{9}$/, 'PIB mora imati tačno 9 cifara'),
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
