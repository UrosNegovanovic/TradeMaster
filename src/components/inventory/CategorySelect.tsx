'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Category } from '@/types/category'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { notify } from '@/lib/notify'
import { sr } from '@/lib/ui-copy'

interface CategorySelectProps {
  value: string | null
  onChange: (value: string | null) => void
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories')
  if (!response.ok) {
    throw new Error('Kategorije nisu učitane')
  }
  return response.json()
}

async function createCategory(data: { name: string; description?: string }): Promise<Category> {
  const response = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || sr.category.createFailed)
  }

  return response.json()
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      onChange(newCategory.id)
      setIsDialogOpen(false)
      setNewCategoryName('')
      setNewCategoryDescription('')
      notify.success(sr.category.created, {
        description: `Dodata je kategorija „${newCategory.name}“`,
      })
    },
    onError: (error: Error) => {
      notify.error(sr.category.createFailed, {
        description: error.message,
      })
    },
  })

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      notify.error(sr.category.nameRequired)
      return
    }

    createMutation.mutate({
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim() || undefined,
    })
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="category">{sr.category.label}</Label>
      <div className="flex gap-2">
        <Select
          value={value || 'none'}
          onValueChange={(val) => onChange(val === 'none' ? null : val)}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={sr.category.select} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{sr.category.uncategorized}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsDialogOpen(true)}
          title={sr.category.add}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{sr.category.createTitle}</DialogTitle>
            <DialogDescription>
              {sr.category.createDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">
                {sr.category.name} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category-name"
                placeholder={sr.category.namePlaceholder}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateCategory()
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-description">{sr.category.description}</Label>
              <Input
                id="category-description"
                placeholder={sr.category.descriptionPlaceholder}
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setNewCategoryName('')
                setNewCategoryDescription('')
              }}
              disabled={createMutation.isPending}
            >
              {sr.common.cancel}
            </Button>
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={createMutation.isPending || !newCategoryName.trim()}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {sr.category.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
