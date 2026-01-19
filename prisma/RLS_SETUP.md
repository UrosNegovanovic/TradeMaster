# Row-Level Security (RLS) Setup Guide

## Problem

Supabase Assistant reports that 7 tables don't have Row-Level Security (RLS) enabled:
- `profiles`
- `products`
- `categories`
- `catalogs`
- `catalog_items`
- `invoices`
- `invoice_items`

## Solution

Since **TradeMaster uses Clerk for authentication** (not Supabase Auth) and **Prisma with service_role connection**, RLS policies are set up to:

1. ✅ **Enable RLS on all tables** (required by Supabase security standards)
2. ✅ **Allow service_role full access** (Prisma uses this, so app functionality is preserved)
3. ✅ **Block anonymous access** (defense-in-depth security)
4. ✅ **Provide additional protection** if someone accidentally uses anon/authenticated keys

## Important Notes

⚠️ **TradeMaster Architecture:**
- Uses **Clerk** for authentication (not Supabase Auth)
- All database operations go through **Prisma ORM**
- Prisma uses **service_role connection** (bypasses RLS)
- Application-level access control via `profileId` filtering

✅ **Why RLS is Safe:**
- `service_role` bypasses RLS, so your app continues working normally
- RLS provides defense-in-depth if someone accidentally uses wrong keys
- No changes needed in application code

## How to Apply RLS

### Option 1: Quick Setup (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Create a new query

2. **Copy and run the simplified script:**
   ```bash
   # Copy contents of prisma/enable_rls.sql
   ```
   - Paste into SQL Editor
   - Click **Run**

3. **Verify:**
   - Check that all tables show "RLS Enabled" in Supabase dashboard
   - Test your application - it should work exactly as before

### Option 2: Detailed Setup

If you want more detailed policies (with authenticated user access), use:
```bash
# Copy contents of prisma/rls_policies.sql
```

## Verification

After running the script, verify RLS is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'products', 'categories', 'catalogs', 'catalog_items', 'invoices', 'invoice_items')
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

## Policy Details

### For each table, we create:

1. **service_role_all_access policy**
   - Allows full access for service_role
   - This is what Prisma uses, so your app works normally

2. **block_anon_access policy**
   - Blocks all access for anonymous users
   - Defense-in-depth security

### Policy Pattern:

```sql
-- Enable RLS
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Allow service_role (Prisma)
CREATE POLICY "table_service_role_all" ON public.table_name
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Block anonymous
CREATE POLICY "table_block_anon" ON public.table_name
  FOR ALL TO anon USING (false) WITH CHECK (false);
```

## Troubleshooting

### "Policy already exists" error
- The script includes `DROP POLICY IF EXISTS` commands
- Re-run the script - it will replace existing policies

### Application stops working
- Check that your `DATABASE_URL` uses service_role connection
- Verify Prisma connection in `src/lib/prisma.ts`
- Service_role bypasses RLS, so this shouldn't happen

### Need to disable RLS temporarily
```sql
ALTER TABLE public.table_name DISABLE ROW LEVEL SECURITY;
```

## Security Best Practices

✅ **What we've done:**
- Enabled RLS on all tables
- Blocked anonymous access
- Allowed service_role (required for Prisma)

✅ **Application-level security (already in place):**
- Clerk authentication in Next.js
- Profile-based filtering (`profileId`) in API routes
- Server-side validation in all endpoints

✅ **Result:**
- Defense-in-depth security
- Supabase security warnings resolved
- Application functionality preserved
