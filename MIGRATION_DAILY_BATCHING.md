# Daily Batching Migration Guide

## ⚠️ IMPORTANT: Database Migration Required

The "Daily Batching" feature requires removing the unique constraint on `[profileId, sku]` from the Product table.

### Step 1: Run Migration Command

```bash
npx prisma migrate dev --name remove_product_sku_unique_constraint
```

This will:
1. Generate a new migration file
2. Remove the `@@unique([profileId, sku])` constraint
3. Add new indexes for better query performance
4. Apply the changes to your database

### Step 2: Verify Migration

After running the migration, verify that:
- The unique constraint is removed
- New indexes are created (`sku`, `createdAt`)
- All existing data is preserved

### Step 3: (Optional) If Migration Fails

If you encounter issues, you can manually create the migration:

1. Run: `npx prisma migrate dev --create-only --name remove_product_sku_unique_constraint`
2. Edit the generated SQL file in `prisma/migrations/`
3. Ensure it contains:

```sql
-- Drop the unique constraint
DROP INDEX IF EXISTS "products_profileId_sku_key";

-- Add new indexes
CREATE INDEX "products_sku_idx" ON "products"("sku");
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");
```

4. Run: `npx prisma migrate deploy`

### Step 4: Update Prisma Client

```bash
npx prisma generate
```

This regenerates the Prisma Client with the new schema.

---

## What Changed?

### Before (Old Constraint)
```prisma
model Product {
  // ...
  @@unique([profileId, sku]) // ❌ Prevented multiple entries per SKU
}
```

### After (Daily Batching)
```prisma
model Product {
  // ...
  // ✅ Removed unique constraint to allow daily batching
  @@index([sku])        // Added for fast SKU lookups
  @@index([createdAt])  // Added for date-based queries
}
```

---

## Impact on Existing Data

**Existing products are NOT affected.** The migration only changes the constraint rules for future inserts.

- ✅ All existing products remain unchanged
- ✅ You can now scan the same SKU on different days
- ✅ Warehouse automatically aggregates totals by SKU
- ✅ Inventory shows individual daily batches

---

## Next Steps

After the migration is complete, restart your development server:

```bash
npm run dev
```

Your "Daily Batching" feature is now active! 🎉
