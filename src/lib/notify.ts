'use client'

import { toast } from 'sonner'
import { showAppToast, type AppToastVariant } from '@/components/ui/app-toast'

interface NotifyOptions {
  description?: string
  duration?: number
  id?: string | number
}

function show(variant: AppToastVariant, title: string, options: NotifyOptions = {}) {
  return showAppToast(variant, title, options)
}

export const notify = {
  success(title: string, options?: NotifyOptions) {
    return show('success', title, options)
  },
  error(title: string, options?: NotifyOptions) {
    return show('error', title, options)
  },
  info(title: string, options?: NotifyOptions) {
    return show('info', title, options)
  },
  dismiss(id?: string | number) {
    toast.dismiss(id)
  },
}
