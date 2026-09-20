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

interface CategorySelectProps {
  value: string | null
  onChange: (value: string | null) => void
}

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories')
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
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
    throw new Error(error.error || 'Failed to create category')
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
      notify.success('Category created', {
        description: `"${newCategory.name}" has been added.`,
      })
    },
    onError: (error: Error) => {
      notify.error('Failed to create category', {
        description: error.message,
      })
    },
  })

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      notify.error('Category name is required')
      return
    }

    createMutation.mutate({
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim() || undefined,
    })
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="category">Category</Label>
      <div className="flex gap-2">
        <Select
          value={value || 'none'}
          onValueChange={(val) => onChange(val === 'none' ? null : val)}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Uncategorized</SelectItem>
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
          title="Add new category"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your products.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category-name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category-name"
                placeholder="e.g., Chocolates, Coffee, Shampoos"
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
              <Label htmlFor="category-description">Description (optional)</Label>
              <Input
                id="category-description"
                placeholder="Brief description of this category"
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
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={createMutation.isPending || !newCategoryName.trim()}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
