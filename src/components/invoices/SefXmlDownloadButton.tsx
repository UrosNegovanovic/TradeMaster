'use client'

import { useState } from 'react'
import { FileCode2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { readApiErrorMessage } from '@/lib/api-error'
import { sefXmlFileName } from '@/lib/document-type'
import { useAuthorizedFetch } from '@/lib/use-authorized-fetch'
import { sr } from '@/lib/ui-copy'

type SefXmlDownloadButtonProps = {
  invoiceId: string
  invoiceNumber: string
}

/** Downloads the UBL file the user uploads on the SEF portal (Izlazni dokumenti → Učitaj datoteku). */
export function SefXmlDownloadButton({ invoiceId, invoiceNumber }: SefXmlDownloadButtonProps) {
  const request = useAuthorizedFetch()
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    try {
      const response = await request(`/api/invoices/${invoiceId}/sef-xml`)
      if (response.status === 422) {
        const body = (await response.json().catch(() => ({}))) as { error?: string; problems?: unknown }
        const problems = Array.isArray(body.problems)
          ? body.problems.filter((p): p is string => typeof p === 'string')
          : []
        notify.error(body.error || 'Za XML fakturu nedostaju podaci.', {
          description: problems.length
            ? `${problems.join(' ')} ${sr.sef.problemsHint}`
            : undefined,
        })
        return
      }
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, 'XML nije napravljen'))
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = sefXmlFileName(invoiceNumber)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      notify.success('XML je preuzet', {
        description: 'Na SEF portalu: Izlazni dokumenti → Učitaj datoteku.',
      })
    } catch (error) {
      notify.error('XML nije napravljen', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-full sm:w-auto"
      disabled={loading}
      onClick={download}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode2 className="mr-2 h-4 w-4" />}
      XML za SEF
    </Button>
  )
}
