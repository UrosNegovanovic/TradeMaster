'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'
import { invoiceDraftSnapshot } from '@/lib/unsaved-changes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DraftNumberInput } from '@/components/ui/draft-number-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Loader2, AlertTriangle, ScanBarcode } from 'lucide-react'
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner'
import { notify } from '@/lib/notify'
import { scanBeep } from '@/lib/scan-beep'
import { createScanGate } from '@/lib/scan-gate'
import { findProductByScan, scanTarget } from '@/lib/invoice-scan'
import type { InvoiceCopyPrefill } from '@/lib/invoice-copy'
import { Product } from '@/types/product'
import type { Client } from '@/types/client'
import { clientToInvoiceFields, findSavedClientForInvoice, newClientFromInvoice, savedClientDiffers } from '@/lib/client-fill'
import { Checkbox } from '@/components/ui/checkbox'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import { REGISTRATION_NUMBER_LENGTH } from '@/lib/company-fields'
import { InvoiceCreateInput, InvoiceStatus } from '@/types/invoice'
import { invoiceCreateSchema, invoiceWriteSchema } from '@/lib/validations'
import { documentLabels } from '@/lib/document-type'
import { InvoiceProductPicker } from '@/components/invoices/InvoiceProductPicker'
import { DEFAULT_VAT_RATE, VAT_RATE_OPTIONS, summarizeVat } from '@/lib/invoice-vat'
import { sr } from '@/lib/ui-copy'
import { defaultDueDateYmd } from '@/lib/local-date'
import { PIB_LENGTH, addressHasCity, digitsOnly, pibProblem } from '@/lib/company-fields'
import {
  clampDiscountPercent,
  lineDiscountAmount,
  lineSubtotal,
  lineTotal,
  addReservedStock,
  remainingStock,
  stockBySku,
} from '@/lib/invoice-line'

interface InvoiceFormProps {
  products: Product[]
  clients?: Client[]
  /** Company is in the PDV system (new invoices and drafts). Issued invoices keep their own snapshot. */
  inVatSystem?: boolean
  onSubmit: (data: InvoiceCreateInput) => Promise<void>
  /** Where "Otkaži" goes; the page's parent route. */
  cancelHref?: string
  isLoading?: boolean
  initialData?: any // Invoice data for edit mode
  /** New documents only; an edited one keeps initialData.documentType. */
  documentType?: 'INVOICE' | 'PROFORMA'
  /** New documents only: buyer and lines copied from another document ("Kopiraj"). */
  prefill?: InvoiceCopyPrefill
  /** Company defaults for a new document (ROADMAP A9.22). */
  defaultPaymentDays?: number | null
  defaultNote?: string | null
}

interface InvoiceItemRow {
  id: string
  /** Free line (ROADMAP A9.11): typed name, no product, no stock movement. */
  free?: boolean
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  vatRate: number
  total: number
}

const INVOICE_ITEM_TRACKS =
  'md:grid-cols-[minmax(0,2.8fr)_minmax(5.25rem,0.55fr)_minmax(5.75rem,0.6fr)_minmax(5.75rem,0.6fr)_minmax(6.5rem,0.65fr)_auto]'
const INVOICE_ITEM_TRACKS_VAT =
  'md:grid-cols-[minmax(0,2.6fr)_minmax(5rem,0.5fr)_minmax(5.5rem,0.6fr)_minmax(5.5rem,0.55fr)_minmax(5.25rem,0.5fr)_minmax(6.5rem,0.65fr)_auto]'

const mobileFieldLabelClass = 'mb-1.5 block text-sm leading-snug tracking-normal md:hidden'

export function InvoiceForm({
  products,
  clients = [],
  inVatSystem = false,
  onSubmit,
  isLoading = false,
  initialData,
  cancelHref,
  documentType: newDocumentType = 'INVOICE',
  prefill,
  defaultPaymentDays,
  defaultNote,
}: InvoiceFormProps) {
  const documentType: 'INVOICE' | 'PROFORMA' =
    initialData?.documentType === 'PROFORMA' || (!initialData && newDocumentType === 'PROFORMA')
      ? 'PROFORMA'
      : 'INVOICE'
  const isProformaDoc = documentType === 'PROFORMA'
  const labels = documentLabels(documentType)
  // An issued invoice keeps the PDV setting it was issued with; a draft/new invoice follows the company.
  const vatEnabled =
    initialData && initialData.status !== InvoiceStatus.DRAFT
      ? initialData.vatEnabled === true
      : inVatSystem
  const defaultVatRate = vatEnabled ? DEFAULT_VAT_RATE : 0
  const itemTracks = vatEnabled ? INVOICE_ITEM_TRACKS_VAT : INVOICE_ITEM_TRACKS
  const [invoiceNumber, setInvoiceNumber] = useState('')
  // 30 Belgrade calendar days from today.
  const [dueDate, setDueDate] = useState(() => defaultDueDateYmd(defaultPaymentDays ?? 30))
  // A copied document keeps its note; a new one starts from the company default.
  const [note, setNote] = useState(() => prefill?.note ?? defaultNote ?? '')
  const [clientName, setClientName] = useState(prefill?.clientName ?? '')
  const [clientAddress, setClientAddress] = useState(prefill?.clientAddress ?? '')
  const [clientPib, setClientPib] = useState(prefill?.clientPib ?? '')
  const [items, setItems] = useState<InvoiceItemRow[]>(() =>
    prefill && prefill.items.length > 0
      ? prefill.items.map((item, index) => ({
          ...item,
          id: `copy-${index}`,
          free: !item.productId,
          total: lineTotal(item.quantity, item.unitPrice, clampDiscountPercent(item.discount)),
        }))
      : [
          {
            id: '1',
            // Without products in Asortiman the first line is a free line, so a service invoice still works.
            free: products.length === 0,
            productId: null,
            productName: '',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            vatRate: inVatSystem ? DEFAULT_VAT_RATE : 0,
            total: 0,
          },
        ]
  )
  const [formError, setFormError] = useState<string | null>(null)
  // ROADMAP A9.12: remember a new buyer in Kupci while making the document.
  const [saveNewClient, setSaveNewClient] = useState(false)
  const [newClientMb, setNewClientMb] = useState('')
  const request = useAuthorizedFetch()
  const queryClient = useQueryClient()
  const [scannerOpen, setScannerOpen] = useState(false)
  const scanGateRef = useRef(createScanGate())
  // Latest rows for scan reads that arrive faster than React re-renders.
  const itemsRef = useRef(items)
  itemsRef.current = items

  // ✅ Populate form with initial data for edit mode
  useEffect(() => {
    if (initialData) {
      setInvoiceNumber(initialData.invoiceNumber || '')
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '')
      setClientName(initialData.clientName || '')
      setClientAddress(initialData.clientAddress || '')
      setClientPib(initialData.clientPib || '')
      setNote(initialData.note || '')
      
      if (initialData.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((item: any, index: number) => ({
            id: item.id || `${Date.now()}-${index}`,
            free: !item.productId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount || 0),
            vatRate: Number(item.vatRate ?? 0),
            total: lineTotal(
              Number(item.quantity) || 1,
              Number(item.unitPrice),
              Number(item.discount || 0)
            ),
          }))
        )
      }
    }
  }, [initialData])

  const fillFromClient = (client: Client) => {
    const fields = clientToInvoiceFields(client)
    setClientName(fields.clientName)
    setClientPib(fields.clientPib)
    setClientAddress(fields.clientAddress)
  }

  // Editing: the document keeps its own buyer snapshot, so a fix made later in Kupci is offered here (ROADMAP A3.5).
  const savedClientMatch = initialData ? findSavedClientForInvoice(clients, { clientName, clientPib }) : undefined
  const savedClientUpdate =
    savedClientMatch && savedClientDiffers(savedClientMatch, { clientName, clientPib, clientAddress })
      ? savedClientMatch
      : undefined

  // Offer "Sačuvaj kupca" only for a buyer that is not in Kupci yet (same PIB or same name).
  const canSaveClient =
    clientName.trim().length > 0 && !findSavedClientForInvoice(clients, { clientName, clientPib })

  // Unsaved-changes guard: compare what the user can edit with what the form started from.
  const draftSnapshot = invoiceDraftSnapshot({ invoiceNumber, dueDate, clientName, clientAddress, clientPib, note, items })
  const newInvoiceBaseline = useRef(draftSnapshot)
  const baselineSnapshot = useMemo(() => {
    if (!initialData) return newInvoiceBaseline.current
    const storedItems: any[] = initialData.items ?? []
    return invoiceDraftSnapshot({
      invoiceNumber: initialData.invoiceNumber || '',
      dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
      clientName: initialData.clientName || '',
      clientAddress: initialData.clientAddress || '',
      clientPib: initialData.clientPib || '',
      note: initialData.note || '',
      items:
        storedItems.length > 0
          ? storedItems
          : [{ productId: null, productName: '', quantity: 1, unitPrice: 0, discount: 0, vatRate: inVatSystem ? DEFAULT_VAT_RATE : 0 }],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])
  useUnsavedChangesGuard(!isLoading && draftSnapshot !== baselineSnapshot)

  // Calculate grand total
  const vatSummary = useMemo(
    () =>
      summarizeVat(
        items.map((item) => ({ total: item.total, vatRate: vatEnabled ? item.vatRate : 0 }))
      ),
    [items, vatEnabled]
  )
  const grandTotal = vatSummary.total

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]))
  }, [products])
  const stockMap = useMemo(() => {
    const onHand = stockBySku(products)
    if (!initialData || initialData.status === InvoiceStatus.DRAFT) {
      return onHand
    }
    return addReservedStock(
      onHand,
      (initialData.items ?? []).map((item: { productId?: string | null; quantity: number }) => ({
        sku: item.productId ? productsById.get(item.productId)?.sku ?? null : null,
        quantity: item.quantity,
      }))
    )
  }, [initialData, products, productsById])

  const lineStock = useMemo(() => {
    const lines = items.map((item) => ({
      id: item.id,
      sku: item.productId ? productsById.get(item.productId)?.sku ?? null : null,
      quantity: item.quantity,
    }))

    return new Map(
      items.map((item) => {
        const sku = item.productId ? productsById.get(item.productId)?.sku ?? null : null
        const available = remainingStock({
          sku,
          lineId: item.id,
          lines,
          stockBySku: stockMap,
        })
        const shortage =
          available === null ? 0 : Math.max(0, item.quantity - Math.max(0, available))
        return [item.id, { available, shortage, sku }] as const
      })
    )
  }, [items, productsById, stockMap])

  // A proforma takes no stock, so a shortage is only shown, never blocking.
  const hasShortage = !isProformaDoc && [...lineStock.values()].some((entry) => entry.shortage > 0)

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sr-RS', {
      style: 'currency',
      currency: 'RSD',
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Add new item row
  const addItem = () => {
    const newId = Date.now().toString()
    setItems([
      ...items,
      {
        id: newId,
        productId: null,
        productName: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        vatRate: defaultVatRate,
        total: 0,
      },
    ])
  }

  // Remove item row
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof InvoiceItemRow, value: InvoiceItemRow[typeof field]) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }

        if (field === 'productId') {
          updated.free = false
          const selectedProduct = products.find((p) => p.id === value)
          if (selectedProduct) {
            updated.productName = selectedProduct.name
            const productSalePrice = Number(selectedProduct.price)
            updated.unitPrice =
              Number.isFinite(productSalePrice) && productSalePrice > 0 ? productSalePrice : 0
          } else {
            updated.productName = ''
            updated.unitPrice = 0
          }
        }

        updated.total = lineTotal(
          Number(updated.quantity) || 0,
          Number(updated.unitPrice) || 0,
          clampDiscountPercent(Number(updated.discount) || 0)
        )

        return updated
      })
    )
  }

  // Switch a line between "product from Asortiman" and a free line with a typed name.
  const setLineFree = (id: string, free: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, free, productId: null, productName: '', unitPrice: free ? item.unitPrice : 0, total: free ? item.total : 0 }
          : item
      )
    )
  }

  const skuForLine = (line: InvoiceItemRow) =>
    line.productId ? productsById.get(line.productId)?.sku ?? null : null

  const openScanner = () => {
    // iOS only lets audio start inside a tap.
    scanBeep.unlock()
    scanGateRef.current.reset()
    setScannerOpen(true)
  }

  // ROADMAP A4: a scan adds the product as a line, or one more unit of a line it is already on.
  const handleScan = (code: string) => {
    const match = findProductByScan(products, code)
    if (match.kind === 'noise') return
    if (!scanGateRef.current.accept(match.kind === 'found' ? match.product.sku : match.code, Date.now())) return

    if (match.kind === 'not-found') {
      notify.error('Proizvod nije u asortimanu', {
        description: `Šifra ${match.code}. Dodajte ga u Asortiman ili izaberite ručno.`,
        duration: 3000,
      })
      return
    }

    const product = match.product
    const salePrice = Number(product.price)
    const unitPrice = Number.isFinite(salePrice) && salePrice > 0 ? salePrice : 0
    const current = itemsRef.current
    const target = scanTarget(current, product.sku, skuForLine)
    let quantity = 1
    let next: InvoiceItemRow[]

    if (target.action === 'increment') {
      next = current.map((item) => {
        if (item.id !== target.lineId) return item
        quantity = item.quantity + 1
        return {
          ...item,
          quantity,
          total: lineTotal(quantity, item.unitPrice, clampDiscountPercent(item.discount)),
        }
      })
    } else {
      const line: InvoiceItemRow = {
        id: target.action === 'fill' ? target.lineId : `scan-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice,
        discount: 0,
        vatRate: defaultVatRate,
        total: lineTotal(1, unitPrice, 0),
      }
      next =
        target.action === 'fill'
          ? current.map((item) => (item.id === target.lineId ? line : item))
          : [...current, line]
    }

    itemsRef.current = next
    setItems(next)
    void scanBeep.play()
    notify.success(product.name, { description: `Količina: ${quantity}`, duration: 1500 })
  }

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const payload = {
      ...(initialData ? { invoiceNumber: invoiceNumber.trim() } : {}),
      dueDate,
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim() || undefined,
      clientPib: clientPib.trim() || undefined,
      note: note.trim() || null,
      items: items.map((item) => ({
        productId: item.productId || null,
        ...(item.free && !item.productId ? { free: true } : {}),
        productName: item.productName.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        ...(vatEnabled ? { vatRate: item.vatRate } : {}),
      })),
    }

    let clientToSave: ReturnType<typeof newClientFromInvoice> | null = null
    if (canSaveClient && saveNewClient) {
      clientToSave = newClientFromInvoice({ clientName, clientPib, clientAddress, registrationNumber: newClientMb })
      if (!clientToSave.ok) {
        setFormError(`Kupac ne može da se sačuva: ${clientToSave.message} Ispravite ili isključite „Sačuvaj kupca”.`)
        return
      }
    }

    // The server refuses a price of 0 (e.g. "Cena na upit" from a catalog); say which lines need one.
    const unpriced = items.filter((item) => !(Number(item.unitPrice) > 0)).map((item) => item.productName.trim() || 'stavka bez naziva')
    if (unpriced.length > 0) {
      setFormError(`Unesite cenu veću od 0 za: ${unpriced.join(', ')}.`)
      return
    }

    if (items.some((item) => !item.free && !item.productId)) {
      setFormError('Izaberite proizvod u svakoj stavci ili je pretvorite u slobodnu stavku (usluga, prevoz).')
      return
    }

    if (hasShortage) {
      setFormError(
        'Nema dovoljno robe na stanju. Izdavanjem fakture količine se skidaju sa magacina.'
      )
      return
    }

    const validation = initialData
      ? invoiceWriteSchema.safeParse(payload)
      : invoiceCreateSchema.safeParse(payload)
    if (!validation.success) {
      const firstIssue = validation.error.errors[0]
      setFormError(firstIssue?.message || 'Proverite stavke dokumenta.')
      return
    }

    const validatedInvoiceNumber =
      'invoiceNumber' in validation.data && typeof validation.data.invoiceNumber === 'string'
        ? validation.data.invoiceNumber
        : undefined
    const formData: InvoiceCreateInput = {
      ...(validatedInvoiceNumber ? { invoiceNumber: validatedInvoiceNumber } : {}),
      dueDate: validation.data.dueDate,
      clientName: validation.data.clientName,
      clientAddress: validation.data.clientAddress || undefined,
      clientPib: validation.data.clientPib || undefined,
      note: validation.data.note ?? null,
      ...(initialData ? {} : { status: InvoiceStatus.UNPAID, documentType }),
      items: validation.data.items.map((item) => ({
        productId: item.productId ?? null,
        // Keep the free-line flag: without it the server stores no cost for a service line (ROADMAP A9.11).
        ...(item.free && !item.productId ? { free: true } : {}),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        vatRate: vatEnabled ? Number(item.vatRate) : 0,
        total: 0,
      })),
    }

    if (clientToSave?.ok) {
      // Best effort: the document is saved even when remembering the buyer fails.
      try {
        const response = await request('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientToSave.data),
        })
        if (!response.ok) throw new Error('client not saved')
        await queryClient.invalidateQueries({ queryKey: ['clients'] })
        notify.success('Kupac je sačuvan u Kupcima')
      } catch {
        notify.error('Kupac nije sačuvan', { description: 'Dokument se čuva; kupca dodajte na stranici Kupci.' })
      }
    }
    await onSubmit(formData)
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isProformaDoc ? 'Podaci o predračunu' : 'Podaci o fakturi'}</CardTitle>
          <CardDescription>Broj, rok i podaci o kupcu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">{labels.numberLabel}</Label>
              <Input
                id="invoiceNumber"
                value={initialData ? invoiceNumber : 'Dodeljuje se automatski pri čuvanju'}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">
                {labels.dueLabel} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
            {savedClientUpdate ? (
              <div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Kupac {savedClientUpdate.name} u Kupcima ima drugačije podatke. {labels.name} čuva podatke kupca iz
                  trenutka kada je napravljen{isProformaDoc ? '' : 'a'}.
                </p>
                <Button type="button" variant="outline" className="min-h-11 shrink-0 bg-background" onClick={() => fillFromClient(savedClientUpdate)}>
                  Preuzmi podatke iz Kupaca
                </Button>
              </div>
            ) : null}
            {clients.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="savedClient">Sačuvani kupac</Label>
                <select
                  id="savedClient"
                  defaultValue=""
                  onChange={(e) => {
                    const client = clients.find((c) => c.id === e.target.value)
                    if (client) fillFromClient(client)
                  }}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:h-10"
                >
                  <option value="">Izaberite kupca ili unesite ručno</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                      {client.pib ? ` (${client.pib})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="clientName">
                Naziv kupca <span className="text-destructive">*</span>
              </Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Unesite naziv kupca"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPib">PIB kupca</Label>
              <Input
                id="clientPib"
                value={clientPib}
                onChange={(e) => setClientPib(digitsOnly(e.target.value))}
                placeholder="9 cifara"
                inputMode="numeric"
                maxLength={PIB_LENGTH}
              />
              {/* A warning only: an invoice without SEF may still be saved. */}
              {clientPib.trim() && pibProblem(clientPib) ? (
                <p className="text-sm text-amber-700">{pibProblem(clientPib)} SEF ga neće primiti.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientAddress">Adresa kupca</Label>
              <Input
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder={`${sr.address.placeholder} (opciono)`}
              />
              {clientAddress.trim() && !addressHasCity(clientAddress) ? (
                <p className="text-sm text-amber-700">Za SEF adresa treba mesto, npr. &quot;{sr.address.placeholder}&quot;.</p>
              ) : null}
            </div>
            {canSaveClient ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="saveNewClient"
                    checked={saveNewClient}
                    onCheckedChange={(checked) => setSaveNewClient(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="saveNewClient" className="font-normal">
                    Sačuvaj kupca u Kupce
                    <span className="block text-xs text-muted-foreground">
                      Sledeći put ga birate iz liste, bez kucanja naziva, PIB-a i adrese.
                    </span>
                  </Label>
                </div>
                {saveNewClient && clientPib.trim() ? (
                  <div className="space-y-2">
                    <Label htmlFor="newClientMb">Matični broj kupca</Label>
                    <Input
                      id="newClientMb"
                      value={newClientMb}
                      onChange={(e) => setNewClientMb(digitsOnly(e.target.value))}
                      placeholder="8 cifara"
                      inputMode="numeric"
                      maxLength={REGISTRATION_NUMBER_LENGTH}
                    />
                    <p className="text-xs text-muted-foreground">Čuva se u Kupcima; SEF ga traži uz PIB.</p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="invoiceNote">Napomena na dokumentu</Label>
              <textarea
                id="invoiceNote"
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opciono. Štampa se ispod iznosa na PDF-u."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <CardTitle className="text-xl leading-snug tracking-normal">
                Stavke fakture
              </CardTitle>
              <CardDescription className="leading-snug">
                Dodajte proizvode na fakturu
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-2 self-start">
              <Button type="button" variant="outline" className="h-11" onClick={openScanner}>
                <ScanBarcode className="mr-2 h-4 w-4" />
                Skeniraj
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj stavku
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Desktop Table Header */}
            <div
              className={`hidden gap-3 border-b pb-2 text-sm font-medium leading-snug tracking-normal text-muted-foreground md:grid ${itemTracks}`}
            >
              <div>Proizvod</div>
              <div>Količina</div>
              <div>{vatEnabled ? 'Cena bez PDV' : 'Jedinična cena'}</div>
              <div>Popust (%)</div>
              {vatEnabled ? <div>PDV</div> : null}
              <div>{vatEnabled ? 'Iznos bez PDV' : 'Ukupno'}</div>
              <div></div>
            </div>

            {items.map((item) => {
              const stock = lineStock.get(item.id)
              const subtotal = lineSubtotal(item.quantity, item.unitPrice)
              const saved = lineDiscountAmount(item.quantity, item.unitPrice, item.discount)

              return (
              <div
                key={item.id}
                className={`grid grid-cols-1 gap-3 border-b pb-4 md:items-start md:border-0 md:pb-0 ${itemTracks}`}
              >
                <div className="min-w-0 space-y-1.5">
                  {item.free ? (
                    <>
                      <Label htmlFor={`line-name-${item.id}`} className={mobileFieldLabelClass}>
                        Slobodna stavka
                      </Label>
                      <Input
                        id={`line-name-${item.id}`}
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                        placeholder="npr. Prevoz robe, usluga montaže"
                        aria-label="Naziv slobodne stavke"
                        maxLength={255}
                        className="h-11"
                      />
                      {products.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setLineFree(item.id, false)}
                          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Izaberi proizvod iz asortimana
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Label className={mobileFieldLabelClass}>Proizvod</Label>
                      <InvoiceProductPicker
                        products={products}
                        value={item.productId}
                        onChange={(productId) => updateItem(item.id, 'productId', productId)}
                      />
                      <button
                        type="button"
                        onClick={() => setLineFree(item.id, true)}
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Slobodna stavka (usluga, prevoz)
                      </button>
                    </>
                  )}
                </div>

                {/* Quantity and Unit Price - Row on mobile */}
                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div className="min-w-0">
                    <Label className={mobileFieldLabelClass}>Količina</Label>
                    <DraftNumberInput
                      kind="integer"
                      min={1}
                      emptyAs={1}
                      value={item.quantity}
                      onValueChange={(quantity) => updateItem(item.id, 'quantity', quantity)}
                      aria-invalid={Boolean(stock?.shortage)}
                      aria-label="Količina"
                    />
                    {stock?.available !== null && stock?.available !== undefined ? (
                      <p
                        className={
                          stock.shortage > 0
                            ? 'mt-1 break-words text-xs font-medium leading-snug tracking-normal text-amber-700'
                            : 'mt-1 break-words text-xs leading-snug tracking-normal text-muted-foreground'
                        }
                      >
                        {stock.shortage > 0 ? (
                          <>
                            Manjak {stock.shortage} kom (na stanju {Math.max(0, stock.available)}).
                          </>
                        ) : (
                          <>Na stanju: {Math.max(0, stock.available)} kom</>
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <Label className={mobileFieldLabelClass}>Jedinična cena</Label>
                    <DraftNumberInput
                      kind="decimal"
                      min={0}
                      emptyAs={0}
                      value={item.unitPrice}
                      onValueChange={(unitPrice) => updateItem(item.id, 'unitPrice', unitPrice)}
                      aria-label="Jedinična cena"
                    />
                  </div>
                </div>

                {/* Discount and Total - Row on mobile */}
                <div className="grid grid-cols-2 gap-3 md:contents">
                  <div className="min-w-0">
                    <Label className={mobileFieldLabelClass}>Popust (%)</Label>
                    <div className="relative">
                      <DraftNumberInput
                        kind="decimal"
                        min={0}
                        max={100}
                        emptyAs={0}
                        value={item.discount}
                        onValueChange={(discount) => updateItem(item.id, 'discount', discount)}
                        placeholder="0"
                        className="pr-8"
                        aria-label="Popust u procentima"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    {item.discount > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        −{item.discount}% ({formatCurrency(saved)})
                      </p>
                    ) : null}
                  </div>
                  {vatEnabled ? (
                    <div className="min-w-0">
                      <Label className={mobileFieldLabelClass}>PDV</Label>
                      <select
                        aria-label="Stopa PDV-a"
                        className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={item.vatRate}
                        onChange={(e) => updateItem(item.id, 'vatRate', Number(e.target.value))}
                      >
                        {VAT_RATE_OPTIONS.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate === 0 ? 'Bez PDV' : `${rate}%`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="flex min-w-0 flex-col justify-center">
                    <Label className={mobileFieldLabelClass}>
                      {vatEnabled ? 'Iznos bez PDV' : 'Ukupno'}
                    </Label>
                    {item.discount > 0 ? (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(subtotal)}
                      </span>
                    ) : null}
                    <div className="flex h-10 items-center text-sm font-semibold">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <div className="flex justify-end md:justify-start">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="h-11 w-full md:h-9 md:w-auto"
                    >
                      <Trash2 className="h-4 w-4 md:mr-0" />
                      <span className="ml-2 md:hidden">Ukloni</span>
                    </Button>
                  )}
                </div>
              </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 space-y-3 border-t pt-4">
            {hasShortage ? (
              <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Nema dovoljno robe na stanju. Izdavanjem ili označavanjem kao plaćeno količine
                  se skidaju sa magacina — faktura se ne može sačuvati dok ima manjka.
                </p>
              </div>
            ) : null}
            {vatEnabled ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Osnovica</span>
                  <span className="tabular-nums">{formatCurrency(vatSummary.base)}</span>
                </div>
                {vatSummary.groups.map((group) => (
                  <div key={group.rate} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {group.rate === 0 ? 'Bez PDV' : `PDV ${group.rate}%`}
                    </span>
                    <span className="tabular-nums">{formatCurrency(group.vat)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <span className="text-base font-semibold leading-snug tracking-normal sm:text-lg">
                {vatEnabled ? 'Ukupno za uplatu' : 'Ukupno'}
              </span>
              <span className="text-xl font-bold tabular-nums sm:text-2xl">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      {/* Submit Button */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Button type="button" variant="outline" className="h-11 w-full sm:w-auto" asChild>
            <Link href={cancelHref}>Otkaži</Link>
          </Button>
        ) : null}
        <Button type="submit" className="h-11 w-full sm:w-auto" disabled={isLoading || hasShortage}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Čuvanje...
            </>
          ) : (
            labels.saveLabel
          )}
        </Button>
      </div>
    </form>

    {/* Outside the form: no scanner button can submit the invoice. */}
    <BarcodeScanner
      open={scannerOpen}
      onClose={() => setScannerOpen(false)}
      onScanSuccess={handleScan}
      continuousMode
    />
    </>
  )
}
