'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { InvoicePdfData } from '@/components/invoices/InvoicePDF'
import { DELIVERY_ADDRESS_MAX, parseDeliveryNoteDetails } from '@/lib/delivery-note'

const InvoicePdfDownload = dynamic(() => import('@/components/invoices/InvoicePdfDownload'), {
  ssr: false,
  loading: () => (
    <Button disabled className="min-h-11 w-full sm:w-auto">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      PDF…
    </Button>
  ),
})

/** ROADMAP A6: otpremnica for the field, with an optional delivery address and package count. */
export function DeliveryNoteButton({ invoice }: { invoice: InvoicePdfData }) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [packages, setPackages] = useState('')
  const parsed = parseDeliveryNoteDetails({ address, packages })

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Truck className="mr-2 h-4 w-4" />
        Otpremnica
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Otpremnica</DialogTitle>
            <DialogDescription>
              Oba polja su opciona i štampaju se samo na ovoj otpremnici; ne čuvaju se uz fakturu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Adresa isporuke (ako se razlikuje od adrese kupca)</Label>
              <Input
                id="deliveryAddress"
                value={address}
                maxLength={DELIVERY_ADDRESS_MAX}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={invoice.clientAddress || 'npr. Magacin kupca, Industrijska 5'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryPackages">Broj paketa</Label>
              <Input
                id="deliveryPackages"
                value={packages}
                inputMode="numeric"
                onChange={(event) => setPackages(event.target.value)}
                placeholder="npr. 3"
                aria-invalid={!parsed.ok}
              />
            </div>
            {!parsed.ok ? (
              <p className="text-sm text-destructive" role="alert">
                {parsed.error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            {parsed.ok ? (
              <InvoicePdfDownload
                invoice={invoice}
                variant="delivery"
                label="Preuzmi otpremnicu"
                delivery={parsed.details}
                onDone={() => setOpen(false)}
              />
            ) : (
              <Button disabled className="min-h-11 w-full sm:w-auto">
                Preuzmi otpremnicu
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
