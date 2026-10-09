import { z } from 'zod'
import { CATALOG_LAYOUTS, CATALOG_SORT_MODES, DEFAULT_CATALOG_DISPLAY } from './catalog-layout'
import { INVALID_GIRO_MESSAGE, normalizeGiroAccount } from './giro-account'
import { ADDRESS_CITY_MESSAGE, addressHasCity, pibProblem, registrationNumberProblem } from './company-fields'

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
  const label = field === 'discount' ? 'Popust' : 'Cena'
  if (kind === 'invalid') return `${label} mora biti broj`
  if (kind === 'decimals') return `${label} može imati najviše 2 decimale`
  if (kind === 'negative') return `${label} ne može biti negativna`
  return `${label} je van podržanog opsega`
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

const dueDateSchema = z.string().min(1, 'Unesite rok').superRefine((value, ctx) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Rok nije ispravan datum',
    })
  }
})

export const invoiceItemWriteSchema = z.object({
  productId: z.string().min(1, 'Proizvod nije ispravan').nullable().optional(),
  productName: z.string().trim().min(1, 'Unesite naziv stavke').max(255, 'Naziv stavke je predugačak'),
  quantity: z
    .number({ invalid_type_error: 'Količina mora biti broj' })
    .int('Količina mora biti ceo broj')
    .gte(QUANTITY_MIN, 'Količina mora biti najmanje 1')
    .lte(QUANTITY_MAX, 'quantity is outside the supported range'),
  unitPrice: unitPriceSchema,
  discount: discountSchema,
  vatRate: z
    .union([z.literal(0), z.literal(10), z.literal(20)], {
      errorMap: () => ({ message: 'Stopa PDV-a mora biti 0, 10 ili 20%' }),
    })
    .optional()
    .transform((value) => value ?? 0),
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
  invoiceNumber: z.string().trim().min(1, 'Unesite broj dokumenta').max(255),
  dueDate: dueDateSchema,
  clientName: z.string().trim().min(1, 'Unesite naziv kupca').max(255, 'Naziv kupca je predugačak'),
  clientAddress: z.string().max(500).nullable().optional(),
  clientPib: clientPibWriteSchema,
  status: invoiceStatusSchema.optional(),
  items: z.array(invoiceItemWriteSchema).min(1, 'Invoice must have at least one item'),
})

export const documentTypeSchema = z.enum(['INVOICE', 'PROFORMA'])

/** documentType is set once at creation (predračun or faktura) and never changes afterwards. */
export const invoiceCreateSchema = invoiceWriteSchema
  .omit({ invoiceNumber: true })
  .extend({ documentType: documentTypeSchema.optional() })

export const invoicePatchSchema = z
  .object({
    status: invoiceStatusSchema.optional(),
    invoiceNumber: z.string().trim().min(1, 'Unesite broj dokumenta').max(255).optional(),
    dueDate: dueDateSchema.optional(),
    clientName: z.string().trim().min(1, 'Unesite naziv kupca').max(255, 'Naziv kupca je predugačak').optional(),
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
    { message: 'Nema izmena za čuvanje' }
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
  quantity: z.number().int('Količina mora biti ceo broj').min(1, 'Količina mora biti najmanje 1').default(1), // ✅ For warehouse mode scanning
  // "Nizak lager" shows when stock is at or below this (ROADMAP A9.13). Omitted = keep the stored value.
  // An emptied number input arrives as NaN: treat it as "not sent".
  minStock: z.preprocess(
    (value) => (typeof value === 'number' && Number.isNaN(value) ? undefined : value),
    z
      .number({ invalid_type_error: 'Minimalna zaliha mora biti broj' })
      .int('Minimalna zaliha mora biti ceo broj')
      .min(0, 'Minimalna zaliha ne može biti negativna')
      .max(1_000_000, 'Minimalna zaliha je prevelika')
      .optional()
  ),
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
  name: z.string().min(1, 'Unesite naziv kataloga').max(255, 'Naziv kataloga je predugačak'),
  clientName: z.string().max(255).optional().nullable(),
  discount: z.number().min(0, 'Popust ne može biti manji od 0').max(100, 'Popust ne može biti veći od 100%'),
  notes: z.string().max(1000).optional().nullable(),
  // Order matters: it is the manual catalog order (sortOrder).
  productIds: z
    .array(z.string())
    .min(1, 'Izaberite bar jedan proizvod')
    .refine((ids) => new Set(ids).size === ids.length, 'Isti proizvod je izabran dva puta'),
  layout: z.enum(CATALOG_LAYOUTS).default(DEFAULT_CATALOG_DISPLAY.layout),
  groupByCategory: z.boolean().default(DEFAULT_CATALOG_DISPLAY.groupByCategory),
  sortMode: z.enum(CATALOG_SORT_MODES).default(DEFAULT_CATALOG_DISPLAY.sortMode),
  showSku: z.boolean().default(DEFAULT_CATALOG_DISPLAY.showSku),
  showDescription: z.boolean().default(DEFAULT_CATALOG_DISPLAY.showDescription),
  showOriginalPrice: z.boolean().default(DEFAULT_CATALOG_DISPLAY.showOriginalPrice),
})

export type CatalogFormData = z.infer<typeof catalogSchema>

// Profile validations
// Podešavanja use the same rules as the SEF XML (src/lib/company-fields.ts), so a saved company
// is always valid for SEF and every error names its field.
function fieldIssue(ctx: z.RefinementCtx, message: string | null) {
  if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message })
}

const requiredString = (message: string) => z.string({ required_error: message, invalid_type_error: message }).trim()

export const profileSchema = z.object({
  companyName: requiredString('Naziv firme je obavezan.').min(1, 'Naziv firme je obavezan.').max(255),
  contactEmail: z
    .string()
    .email('Email nije ispravan.')
    .optional()
    .nullable()
    .or(z.literal('')),
  contactPhone: z.string().max(50).optional().nullable(),
  address: requiredString('Adresa firme je obavezna.')
    .max(500, 'Adresa je predugačka.')
    .superRefine((value, ctx) =>
      fieldIssue(ctx, !value ? 'Adresa firme je obavezna.' : addressHasCity(value) ? null : ADDRESS_CITY_MESSAGE)
    ),
  pib: requiredString('PIB je obavezan.').superRefine((value, ctx) => fieldIssue(ctx, pibProblem(value))),
  registrationNumber: requiredString('Matični broj je obavezan.').superRefine((value, ctx) =>
    fieldIssue(ctx, registrationNumberProblem(value))
  ),
  giroAccount: requiredString('Žiro-račun je obavezan.')
    .max(80, 'Žiro-račun je predugačak.')
    .superRefine((value, ctx) =>
      fieldIssue(ctx, !value ? 'Žiro-račun je obavezan.' : normalizeGiroAccount(value) ? null : INVALID_GIRO_MESSAGE)
    ),
  inVatSystem: z.boolean().optional(),
  logoUrl: z
    .union([
      z.string().url('Adresa logotipa nije ispravna.'),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .nullable(),
})

export type ProfileFormData = z.infer<typeof profileSchema>

const optionalTrimmed = z.union([z.string(), z.null(), z.undefined()]).transform((value) => normalizeClientPib(value) ?? null)

// Saved buyers (Client). A buyer without PIB (e.g. a person) can be saved; a buyer with a PIB
// needs a valid PIB and matični broj, and an address needs the city, because SEF needs them.
// Blank strings become null. The PIB typed on an invoice itself only needs 9 digits.
export const clientWriteSchema = z
  .object({
    name: z.string().trim().min(1, 'Naziv kupca je obavezan.').max(255),
    pib: optionalTrimmed.superRefine((value, ctx) => {
      if (value !== null) fieldIssue(ctx, pibProblem(value))
    }),
    registrationNumber: optionalTrimmed.superRefine((value, ctx) => {
      if (value !== null) fieldIssue(ctx, registrationNumberProblem(value))
    }),
    address: optionalTrimmed.superRefine((value, ctx) => {
      if (value === null) return
      fieldIssue(ctx, value.length > 500 ? 'Adresa je predugačka.' : addressHasCity(value) ? null : ADDRESS_CITY_MESSAGE)
    }),
  })
  .superRefine((value, ctx) => {
    if (value.pib !== null && value.registrationNumber === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registrationNumber'],
        message: 'Unesite i matični broj kupca (8 cifara). Bez njega faktura ne može u SEF.',
      })
    }
    if (value.pib === null && value.registrationNumber !== null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pib'], message: 'Unesite i PIB kupca (9 cifara).' })
    }
  })

export type ClientWriteInput = z.infer<typeof clientWriteSchema>
