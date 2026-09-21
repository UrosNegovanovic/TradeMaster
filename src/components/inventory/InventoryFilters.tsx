'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Category } from '@/types/category'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { isSameLocalDay, startOfLocalDay } from '@/lib/local-date'

interface InventoryFiltersProps {
  selectedCategory: string | null
  selectedDate: Date | null
  onCategoryChange: (categoryId: string | null) => void
  onDateChange: (date: Date | null) => void
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories')
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }
  return response.json()
}

export function InventoryFilters({
  selectedCategory,
  selectedDate,
  onCategoryChange,
  onDateChange,
}: InventoryFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const today = startOfLocalDay()
  const isTodaySelected = isSameLocalDay(selectedDate, today)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1 min-w-[200px]">
        <Select
          value={selectedCategory || 'all'}
          onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sve kategorije" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sve kategorije</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={isTodaySelected ? 'default' : 'outline'}
          aria-pressed={isTodaySelected}
          onClick={() => onDateChange(isTodaySelected ? null : today)}
        >
          Danas
        </Button>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[240px] justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : <span>Svi datumi</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={(date) => {
                onDateChange(date || null)
                setIsCalendarOpen(false)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {selectedDate ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDateChange(null)}
            aria-label="Ukloni datum"
            title="Ukloni datum"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
