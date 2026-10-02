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

function moneyMessage(
  field: 'unitPrice' | 'discount' | 'costPrice',
  kind: 'invalid' | 'decimals' | 'range' | 'negative'
) {
  if (field === 'costPrice') {
    if (kind === 'invalid') return 'Nabavna cena mora biti broj'
    if (kind === 'decimals') return 'Nabavna cena može imati najviše 2 decimale'
    if (kind === 'negative') return 'Nabavna cena ne može biti negativna'
    return 'Nabavna cena je van podržanog opsega'
  }
  if (kind === 'invalid') return `${field} must be a valid decimal`
  if (kind === 'decimals') return `${field} cannot have more than 2 decimal places`
  if (kind === 'negative') return 'unitPrice must be greater than or equal to 0'
  return `${field} is outside the supported range`
}

function assertMoneyInput(
  value: number | string,
  ctx: z.RefinementCtx,
  field: 'unitPrice' | 'discount' | 'costPrice',
  min: number,
  max: number
) {
  const text = normalizeMoneyInput(value)
  if (!text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: moneyMessage(field, 'invalid'),
    })
    return
  }

  if (!MONEY_INPUT_PATTERN.test(text)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: moneyMessage(field, 'decimals'),
    })
    return
  }

  const amount = Number(text)
  if ((field === 'unitPrice' || field === 'costPrice') && amount < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: moneyMessage(field, 'negative'),
    })
  }
  if (amount < min || amount > max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: moneyMessage(field, 'range'),
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

function normalizeClientPib(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function assertClientPib(value: string | null | undefined, ctx: z.RefinementCtx) {
  if (value === undefined || value === null) return
  if (!/^\d{9}$/.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'PIB kupca mora imati tačno 9 cifara',
    })
  }
}

const clientPibWriteSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => normalizeClientPib(value) ?? null)
  .superRefine((value, ctx) => assertClientPib(value, ctx))

const clientPibPatchSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => (value === undefined ? undefined : normalizeClientPib(value)))
  .superRefine((value, ctx) => assertClientPib(value, ctx))

export const invoiceWriteSchema = z.object({
  invoiceNumber: z.string().trim().min(1, 'invoiceNumber is required').max(255),
  dueDate: dueDateSchema,
  clientName: z.string().trim().min(1, 'clientName is required').max(255),
  clientAddress: z.string().max(500).nullable().optional(),
  clientPib: clientPibWriteSchema,
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
    clientPib: clientPibPatchSchema,
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.invoiceNumber !== undefined ||
      value.dueDate !== undefined ||
      value.clientName !== undefined ||
      value.clientAddress !== undefined ||
      value.clientPib !== undefined,
    { message: 'At least one supported field is required' }
  )

export type InvoiceWriteInput = z.infer<typeof invoiceWriteSchema>
export type InvoiceCreateWriteInput = z.infer<typeof invoiceCreateSchema>
export type InvoicePatchInput = z.infer<typeof invoicePatchSchema>

export const optionalCostPriceSchema = z
  .number({ invalid_type_error: 'Nabavna cena mora biti broj' })
  .superRefine((value, ctx) => {
    assertMoneyInput(value, ctx, 'costPrice', 0, MONEY_MAX)
  })
  .nullable()
  .optional()

export const requiredCostPriceSchema = z
  .number({
    required_error: 'Nabavna cena je obavezna',
    invalid_type_error: 'Nabavna cena mora biti broj',
  })
  .superRefine((value, ctx) => {
    assertMoneyInput(value, ctx, 'costPrice', 0, MONEY_MAX)
  })

export const costPriceZeroReasonSchema = z
  .string()
  .max(200, 'Razlog je predugačak')
  .nullable()
  .optional()

type PurchasePriceFields = {
  costPrice?: number | null
  costPriceZeroReason?: string | null
}

export function refineZeroPurchasePriceReason(data: PurchasePriceFields, ctx: z.RefinementCtx) {
  if (data.costPrice !== 0) {
    return
  }
  const reason = data.costPriceZeroReason?.trim() ?? ''
  if (!reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['costPriceZeroReason'],
      message: 'Unesite razlog za nabavnu cenu 0',
    })
  }
}

export function normalizePurchasePrice<T extends PurchasePriceFields>(data: T): T {
  if (data.costPrice === undefined) {
    return data
  }
  if (data.costPrice === null) {
    return { ...data, costPriceZeroReason: null }
  }
  return {
    ...data,
    costPriceZeroReason: data.costPrice === 0 ? data.costPriceZeroReason?.trim() || null : null,
  }
}

export const bulkAdjustItemSchema = z.object({
  sku: z.string().trim().min(1, 'SKU je obavezan').max(100, 'SKU je predugačak'),
  quantity: z.number({ invalid_type_error: 'Količina mora biti broj' }).int().min(0, 'Količina ne može biti negativna'),
})

export type BulkAdjustItem = z.infer<typeof bulkAdjustItemSchema>

// Product validations
const productFields = {
  name: z.string().min(1, 'Naziv je obavezan').max(255, 'Naziv je predugačak'),
  sku: z.string().min(1, 'SKU je obavezan').max(100, 'SKU je predugačak'),
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
}

const optionalSalePriceSchema = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return 0
  if (typeof value === 'number' && Number.isNaN(value)) return 0
  return value
}, z.number({ invalid_type_error: 'Cena mora biti broj' }).min(0, 'Cena ne može biti negativna'))

/** Warehouse / Quick Scan POST /api/products — sale price 0 is valid (user can update later). */
export const productIntakeSchema = z
  .object({
    ...productFields,
    price: optionalSalePriceSchema,
    costPrice: optionalCostPriceSchema,
    costPriceZeroReason: costPriceZeroReasonSchema,
  })
  .superRefine(refineZeroPurchasePriceReason)
  .transform(normalizePurchasePrice)

/** Manual ProductForm create/edit — purchase price required; sale price optional (invoice can set it). */
export const productSchema = z
  .object({
    ...productFields,
    price: optionalSalePriceSchema,
    costPrice: requiredCostPriceSchema,
    costPriceZeroReason: costPriceZeroReasonSchema,
  })
  .superRefine(refineZeroPurchasePriceReason)
  .transform(normalizePurchasePrice)

export type ProductIntakeData = z.infer<typeof productIntakeSchema>
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
  giroAccount: z
    .string()
    .trim()
    .max(80, 'Žiro-račun je predugačak')
    .optional()
    .nullable()
    .or(z.literal('')),
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

// Saved buyers (Client). PIB and address are optional; blank strings become null.
export const clientWriteSchema = z.object({
  name: z.string().trim().min(1, 'Naziv kupca je obavezan').max(255),
  pib: clientPibWriteSchema,
  address: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => normalizeClientPib(value) ?? null)
    .refine((value) => value === null || value.length <= 500, 'Adresa je predugačka'),
})

export type ClientWriteInput = z.infer<typeof clientWriteSchema>
