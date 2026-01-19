-- ============================================
-- Quick RLS Enable Script (Simplified Version)
-- ============================================
-- This script enables RLS and creates basic policies
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_block_anon" ON public.profiles;
DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
DROP POLICY IF EXISTS "products_block_anon" ON public.products;
DROP POLICY IF EXISTS "categories_service_role_all" ON public.categories;
DROP POLICY IF EXISTS "categories_block_anon" ON public.categories;
DROP POLICY IF EXISTS "catalogs_service_role_all" ON public.catalogs;
DROP POLICY IF EXISTS "catalogs_block_anon" ON public.catalogs;
DROP POLICY IF EXISTS "catalog_items_service_role_all" ON public.catalog_items;
DROP POLICY IF EXISTS "catalog_items_block_anon" ON public.catalog_items;
DROP POLICY IF EXISTS "invoices_service_role_all" ON public.invoices;
DROP POLICY IF EXISTS "invoices_block_anon" ON public.invoices;
DROP POLICY IF EXISTS "invoice_items_service_role_all" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_block_anon" ON public.invoice_items;

-- Create policies for profiles
CREATE POLICY "profiles_service_role_all" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "profiles_block_anon" ON public.profiles
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Create policies for products
CREATE POLICY "products_service_role_all" ON public.products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "products_block_anon" ON public.products
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Create policies for categories
CREATE POLICY "categories_service_role_all" ON public.categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "categories_block_anon" ON public.categories
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Create policies for catalogs
CREATE POLICY "catalogs_service_role_all" ON public.catalogs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "catalogs_block_anon" ON public.catalogs
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Create policies for catalog_items
CREATE POLICY "catalog_items_service_role_all" ON public.catalog_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "catalog_items_block_anon" ON public.catalog_items
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Create policies for invoices
CREATE POLICY "invoices_service_role_all" ON public.invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "invoices_block_anon" ON public.invoices
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Create policies for invoice_items
CREATE POLICY "invoice_items_service_role_all" ON public.invoice_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "invoice_items_block_anon" ON public.invoice_items
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'products', 'categories', 'catalogs', 'catalog_items', 'invoices', 'invoice_items')
ORDER BY tablename;
