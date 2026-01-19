-- Check and create tables if they don't exist
-- Run this in Supabase SQL Editor

-- Create InvoiceStatus enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
        CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PAID', 'UNPAID');
    END IF;
END $$;

-- Create invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientAddress" TEXT,
    status "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "profileId" TEXT NOT NULL,
    CONSTRAINT invoices_profile_fkey FOREIGN KEY ("profileId") REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS invoices_invoiceNumber_idx ON public.invoices("invoiceNumber");
CREATE INDEX IF NOT EXISTS invoices_profileId_idx ON public.invoices("profileId");

-- Create invoice_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id TEXT PRIMARY KEY,
    quantity INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    discount DECIMAL(5,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    "productName" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    CONSTRAINT invoice_items_invoice_fkey FOREIGN KEY ("invoiceId") REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT invoice_items_product_fkey FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE SET NULL
);

-- Create indexes for invoice_items
CREATE INDEX IF NOT EXISTS invoice_items_invoiceId_idx ON public.invoice_items("invoiceId");
CREATE INDEX IF NOT EXISTS invoice_items_productId_idx ON public.invoice_items("productId");

-- Verify tables were created
SELECT 
    'invoices' as table_name, 
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') as exists
UNION ALL
SELECT 
    'invoice_items' as table_name, 
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') as exists;
