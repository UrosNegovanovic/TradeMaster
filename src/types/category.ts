export type Category = {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export type CategoryCreateInput = {
  name: string
  description?: string | null
}

export type CategoryUpdateInput = Partial<CategoryCreateInput>
