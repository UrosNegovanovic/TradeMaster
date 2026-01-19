# 🚀 Warehouse Module - Setup Instructions

## ⚠️ IMPORTANT: Database Migration Required

Before using the Warehouse module, you **MUST** run the database migration to add the new fields and tables.

---

## 📋 **Step-by-Step Setup**

### **Step 1: Stop Development Server**

```bash
# Press Ctrl+C in the terminal running npm run dev
```

---

### **Step 2: Generate Prisma Client**

```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client
```

---

### **Step 3: Push Schema Changes to Database**

```bash
npx prisma db push
```

**Expected Output:**
```
Applying migration...
The following migration(s) have been applied:

migrations/
  └─ 20260118_add_warehouse_module/
      └─ migration.sql

Your database is now in sync with your Prisma schema.
✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client
```

**What This Does:**
- Adds `quantity` column to `products` table (default: 0)
- Adds `minStock` column to `products` table (default: 10)
- Creates `stock_movements` table
- Creates `MovementType` enum

---

### **Step 4: Restart Development Server**

```bash
npm run dev
```

---

### **Step 5: Verify Setup**

1. Open browser: `http://localhost:3000/dashboard`
2. Check Sidebar: "Magacin" link should appear (between Invoices and Settings)
3. Click "Magacin" → Should load Warehouse page
4. Verify sections:
   - ✅ "Register Stock In" button
   - ✅ "Register Stock Out" button
   - ✅ "Stock Movement History" table (empty initially)
   - ⚠️ Low Stock Alerts may appear if existing products have quantity = 0

---

## 🧪 **Quick Test**

### **Test 1: Register Stock IN**

1. Go to `/warehouse`
2. Click "Register Stock In"
3. Select a product from dropdown
4. Enter quantity: `50`
5. Enter reason: `Initial stock`
6. Click "Register Stock In"
7. **Expected**:
   - ✅ Success toast appears
   - ✅ Movement appears in history table (green "IN" badge)
   - ✅ Product quantity updated (verify in Inventory page)

---

### **Test 2: Check Low Stock Alerts**

1. Create a product with quantity: 5, minStock: 10 (or existing product at 0)
2. Navigate to `/warehouse`
3. **Expected**:
   - ⚠️ Red alert box appears at top
   - ✅ Product listed with current/min stock ratio
   - ✅ Status: "Low stock" or "Out of stock"

---

### **Test 3: Register Stock OUT**

1. Click "Register Stock Out"
2. Select a product (must have stock > 0)
3. Enter quantity (less than current stock)
4. Enter reason: `Sale`
5. Click "Register Stock Out"
6. **Expected**:
   - ✅ Success toast
   - ✅ Movement appears in history (red "OUT" badge)
   - ✅ Product quantity decreased

---

## 🔍 **Troubleshooting**

### **Issue 1: Migration Fails**

**Error:** `Error: P3009: migrate found failed migrations...`

**Solution:**
```bash
npx prisma migrate reset
npx prisma db push
```

**Warning:** This will **delete all data**. Only use in development!

---

### **Issue 2: "Module not found" Errors**

**Error:** `Cannot find module '@/types/warehouse'`

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Press Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

---

### **Issue 3: Prisma Client Out of Sync**

**Error:** `Property 'stockMovement' does not exist on type 'PrismaClient'`

**Solution:**
```bash
npx prisma generate
# Restart dev server
```

---

### **Issue 4: Low Stock Alerts Not Showing**

**Cause:** All products have `quantity > minStock`

**Solution:**
```bash
# Option 1: Update a product via Prisma Studio
npx prisma studio
# → Open "Product" table → Edit a product → Set quantity to 0 or 5

# Option 2: SQL query (if using Supabase)
UPDATE products SET quantity = 5, "minStock" = 10 WHERE id = 'product_id_here';
```

---

### **Issue 5: "Insufficient stock" Error When Testing**

**Cause:** Product has 0 quantity and you're trying Stock OUT

**Solution:**
1. First register Stock IN for that product
2. Then test Stock OUT

---

## 📊 **Database Verification**

### **Check if Migration Applied**

**Option 1: Prisma Studio**
```bash
npx prisma studio
```
- Check `products` table has `quantity` and `minStock` columns
- Check `stock_movements` table exists

**Option 2: SQL Query (Supabase)**
```sql
-- Check Product columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('quantity', 'minStock');

-- Expected Output:
-- quantity   | integer | 0
-- minStock   | integer | 10

-- Check StockMovement table
SELECT * FROM stock_movements LIMIT 1;
-- Expected: Empty result (no error)
```

---

## 🎯 **Next Steps After Setup**

### **1. Set Initial Stock for Existing Products**

If you have existing products, they will have `quantity = 0` by default.

**Option A: Via Warehouse UI (Recommended)**
1. Go to `/warehouse`
2. Click "Register Stock In"
3. Select each product
4. Enter initial stock quantity
5. Reason: "Initial inventory"

**Option B: Via SQL (Bulk Update)**
```sql
-- Set all products to 50 units
UPDATE products SET quantity = 50;

-- Or set specific products
UPDATE products SET quantity = 100 WHERE name LIKE '%Coffee%';
UPDATE products SET quantity = 20 WHERE name LIKE '%Chocolate%';
```

---

### **2. Customize minStock Thresholds**

Default is 10 units. Adjust per product type:

**Via SQL:**
```sql
-- High-demand products: higher threshold
UPDATE products SET "minStock" = 50 WHERE category_id = 'coffee_category_id';

-- Low-demand products: lower threshold
UPDATE products SET "minStock" = 5 WHERE category_id = 'samples_category_id';
```

**Via Inventory UI (Future Enhancement):**
- Edit product → Add "Min Stock" field

---

### **3. Train Users on Workflow**

**Daily Workflow:**
1. Check `/warehouse` for low stock alerts
2. Register Stock IN when receiving shipments
3. Register Stock OUT when making sales (optional, if not automatic)
4. Review Stock Movement History for auditing

---

## 📝 **Summary**

**Required Commands:**
```bash
# 1. Stop server (Ctrl+C)
# 2. Generate client
npx prisma generate
# 3. Push schema
npx prisma db push
# 4. Start server
npm run dev
```

**Verification:**
- ✅ Sidebar has "Magacin" link
- ✅ `/warehouse` page loads without errors
- ✅ Can register Stock IN/OUT
- ✅ Stock movements appear in history
- ✅ Product quantities update correctly

**If Everything Works:**
- ✅ Module is ready for production use
- ✅ No further setup required
- ✅ Start tracking inventory!

---

**Last Updated:** 2026-01-18  
**Support:** See `WAREHOUSE_MODULE.md` for detailed documentation
