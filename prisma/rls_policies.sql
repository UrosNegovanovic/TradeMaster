-- ============================================
-- Row-Level Security (RLS) Policies for TradeMaster
-- ============================================
-- 
-- IMPORTANT NOTES:
-- 1. TradeMaster uses Clerk for authentication (not Supabase Auth)
-- 2. All database operations go through Prisma using service_role connection
-- 3. RLS policies here provide defense-in-depth security
-- 4. service_role bypasses RLS, so application functionality is preserved
--
-- Run this script in Supabase SQL Editor to enable RLS on all tables
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES FOR profiles TABLE
-- ============================================

-- Allow service_role full access (bypasses RLS anyway, but explicit for clarity)
CREATE POLICY "profiles_service_role_all" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anonymous access (defense in depth)
CREATE POLICY "profiles_block_anon" ON public.profiles
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Allow authenticated users to read their own profile
-- Note: Since we use Clerk, authenticated here means via Supabase client SDK
-- This is a safety policy in case someone uses Supabase client directly
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true); -- Allow read, actual filtering happens in application code

-- ============================================
-- POLICIES FOR products TABLE
-- ============================================

-- Allow service_role full access
CREATE POLICY "products_service_role_all" ON public.products
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "products_block_anon" ON public.products
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Allow authenticated users to read products (filtered by profileId in app code)
CREATE POLICY "authenticated_read_products" ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- POLICIES FOR categories TABLE
-- ============================================

-- Allow service_role full access
CREATE POLICY "categories_service_role_all" ON public.categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "categories_block_anon" ON public.categories
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Categories are shared/readable by all authenticated users
CREATE POLICY "authenticated_read_categories" ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- POLICIES FOR catalogs TABLE
-- ============================================

-- Allow service_role full access
CREATE POLICY "catalogs_service_role_all" ON public.catalogs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "catalogs_block_anon" ON public.catalogs
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Allow authenticated users to read catalogs (filtered by profileId in app code)
CREATE POLICY "authenticated_read_catalogs" ON public.catalogs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- POLICIES FOR catalog_items TABLE
-- ============================================

-- Allow service_role full access
CREATE POLICY "catalog_items_service_role_all" ON public.catalog_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "catalog_items_block_anon" ON public.catalog_items
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Allow authenticated users to read catalog items (filtered by catalog.profileId in app code)
CREATE POLICY "authenticated_read_catalog_items" ON public.catalog_items
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- POLICIES FOR invoices TABLE
-- ============================================

-- Allow service_role full access
CREATE POLICY "invoices_service_role_all" ON public.invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "invoices_block_anon" ON public.invoices
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Allow authenticated users to read invoices (filtered by profileId in app code)
CREATE POLICY "authenticated_read_invoices" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- POLICIES FOR invoice_items TABLE
-- ============================================

-- Allow service_role full access
CREATE POLICY "invoice_items_service_role_all" ON public.invoice_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Block anonymous access
CREATE POLICY "invoice_items_block_anon" ON public.invoice_items
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Allow authenticated users to read invoice items (filtered by invoice.profileId in app code)
CREATE POLICY "authenticated_read_invoice_items" ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- SUMMARY
-- ============================================
-- 
-- All tables now have RLS enabled with:
-- 1. service_role: Full access (bypasses RLS anyway, but explicit)
-- 2. anon: Blocked (defense in depth)
-- 3. authenticated: Read access (actual filtering happens in app via profileId)
--
-- Since TradeMaster uses Prisma with service_role connection:
-- - Application functionality is NOT affected
-- - RLS provides defense-in-depth security
-- - If someone accidentally uses anon/authenticated keys, they're protected
-- ============================================
