'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { stockListFilename } from '@/lib/stock-list'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'

/** "Lager lista" XLSX for the accountant and stocktaking (ROADMAP A9.19). Works after access expires too. */
export function StockListExportButton() {
  const request = useAuthorizedFetch()
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const response = await request('/api/warehouse/stock-list?format=xlsx')
      if (!response.ok) throw new Error(await readApiErrorMessage(response, 'Lager lista nije preuzeta.'))
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = stockListFilename('xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      notify.success('Lager lista je preuzeta', { description: 'Stanje, nabavna i prodajna vrednost po šifri.' })
    } catch (error) {
      notify.error('Lager lista nije preuzeta', { description: error instanceof Error ? error.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button onClick={download} variant="outline" className="w-full sm:w-auto" disabled={busy}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      Lager lista (Excel)
    </Button>
  )
}
