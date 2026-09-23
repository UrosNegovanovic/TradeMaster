import { StockMovement } from '@/types/warehouse'
import { isSameLocalDay } from '@/lib/local-date'

export function filterStockMovements(
  movements: StockMovement[],
  searchQuery: string,
  selectedDate?: Date
): StockMovement[] {
  const query = searchQuery.toLowerCase().trim()

  return movements.filter((movement) => {
    if (selectedDate && !isSameLocalDay(new Date(movement.createdAt), selectedDate)) {
      return false
    }

    if (!query) {
      return true
    }

    return (
      movement.product.name.toLowerCase().includes(query) ||
      movement.product.sku.toLowerCase().includes(query)
    )
  })
}
