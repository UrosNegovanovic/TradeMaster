# Invoice Tables Setup Guide

## Problem
Dev server pokazuje grešku: `The table 'public.invoices' does not exist in the current database.`

## Rešenje

### Korak 1: Proveri da li tabele postoje u Supabase

1. Otvori **Supabase Dashboard**
2. Idi na **SQL Editor**
3. Izvrši sledeći upit:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('invoices', 'invoice_items');
```

### Korak 2a: Ako tabele POSTOJE

Tabele su već kreirane, ali Prisma Client nije ažuriran. Ovo je već rešeno sa:
- `npx prisma generate` ✅
- Restart dev server ✅

### Korak 2b: Ako tabele NE POSTOJE

Izvrši SQL script `prisma/check_and_create_tables.sql` u Supabase SQL Editor-u.

**Ili** jednostavno pokreni:

```bash
npx prisma db push
```

### Korak 3: Restartuj aplikaciju

```bash
# Stop dev server (Ctrl+C)
# Generate Prisma Client
npx prisma generate

# Start dev server
npm run dev
```

## Verifikacija

1. Otvori aplikaciju: http://localhost:3000
2. Idi na **Invoices** → **New Invoice**
3. Kreiraj test fakturu sa popustom
4. Proveri da se faktura uspešno čuva

## Discount Feature

Novi `discount` field je dodat u `invoice_items` tabelu:
- Tip: `DECIMAL(5,2)` (procenat)
- Default: 0
- Range: 0-100%
- Formula: `total = quantity × unitPrice × (1 - discount/100)`

## Troubleshooting

### EPERM error tokom `prisma generate`
**Uzrok:** Dev server je aktivan i koristi Prisma Client fajlove.
**Rešenje:** Stop dev server pre `prisma generate`.

### "Table does not exist" error
**Uzrok:** Tabele nisu kreirane u bazi.
**Rešenje:** Pokreni `prisma/check_and_create_tables.sql` u Supabase.

### "Drift detected" tokom migrate
**Uzrok:** Koristili smo `db push` umesto migracija.
**Rešenje:** Nastavi da koristiš `db push` za development ili pokreni `prisma migrate dev --create-only` pa ručno primeni SQL.
