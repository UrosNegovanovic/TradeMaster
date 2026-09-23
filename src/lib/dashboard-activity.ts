import { startOfLocalDay } from '@/lib/local-date'

export const DASHBOARD_OPEN_INVOICE_PREVIEW = 8
export const DASHBOARD_LOW_STOCK_PREVIEW = 8
export const DASHBOARD_TODAY_MOVEMENT_PREVIEW = 12
export const DASHBOARD_TODAY_INTAKE_PREVIEW = 8

export type DashboardMovement = {
  id: string
  type: 'IN' | 'OUT'
  quantity: number
  reason: string
  createdAt: Date | string
  product: {
    id: string
    name: string
    sku: string
  }
}

export type MovementGroupTotal = {
  type: string
  count: number
  quantity: number
}

export type TodayMovementTotals = {
  intakeCount: number
  intakeQuantity: number
  outCount: number
  outQuantity: number
}

export function movementTotalsFromGroups(groups: MovementGroupTotal[]): TodayMovementTotals {
  const totals: TodayMovementTotals = {
    intakeCount: 0,
    intakeQuantity: 0,
    outCount: 0,
    outQuantity: 0,
  }

  for (const group of groups) {
    if (group.type === 'IN') {
      totals.intakeCount += group.count
      totals.intakeQuantity += group.quantity
    } else if (group.type === 'OUT') {
      totals.outCount += group.count
      totals.outQuantity += group.quantity
    }
  }

  return totals
}

export function previewTodayIntakes(
  movements: DashboardMovement[],
  limit = DASHBOARD_TODAY_INTAKE_PREVIEW
): DashboardMovement[] {
  return movements.filter((movement) => movement.type === 'IN').slice(0, limit)
}

export function previewTodayMovements(
  movements: DashboardMovement[],
  limit = DASHBOARD_TODAY_MOVEMENT_PREVIEW
): DashboardMovement[] {
  return movements.slice(0, limit)
}

export function isInvoiceOverdue(dueDate: Date | string, now = new Date()): boolean {
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
  if (Number.isNaN(due.getTime())) {
    return false
  }

  return startOfLocalDay(due).getTime() < startOfLocalDay(now).getTime()
}

export function countOverdueInvoices(
  invoices: Array<{ dueDate: Date | string }>,
  now = new Date()
): number {
  return invoices.filter((invoice) => isInvoiceOverdue(invoice.dueDate, now)).length
}

export function formatDashboardDate(date: Date | string): string {
  return new Intl.DateTimeFormat('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDashboardTime(date: Date | string): string {
  return new Intl.DateTimeFormat('sr-RS', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
