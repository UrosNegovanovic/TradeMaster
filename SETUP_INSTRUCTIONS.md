# 🚀 TradeMaster - Setup Uputstva

## Korak 1: Kreiraj .env.local fajl ✅

Fajl `.env.local` je već kreiran u root-u projekta sa template vrednostima. Sada treba da zameniš placeholder vrednosti sa stvarnim ključevima.

## Korak 2: Nabavi Ključeve

### 📦 Supabase Setup

1. **Idi na [supabase.com](https://supabase.com)** i uloguj se
2. **Kreiraj novi projekat:**
   - Klikni "New Project"
   - Ime projekta: `TradeMaster`
   - **VAŽNO: Zapiši lozinku baze koju uneseš!** (trebaće ti za DATABASE_URL)
   - Izaberi region (najbližu tebi)
   - Sačekaj da se projekat kreira (~2 minuta)

3. **Uzmi Database Connection String:**
   - Idi na **Project Settings** (ikonica zupčanika)
   - Idi na **Database** sekciju
   - Skroluj do **Connection String** sekcije
   - Izaberi **URI** format
   - Kopiraj connection string
   - **Zameni `[YOUR-PASSWORD]` sa lozinkom koju si uneo pri kreiranju projekta**
   - Primer: `postgresql://postgres:mojaLozinka123@db.abcdefghijklmnop.supabase.co:5432/postgres`

4. **Uzmi API Keys:**
   - U istom **Project Settings** -> **API** sekciji
   - Kopiraj **Project URL** (to je tvoj `NEXT_PUBLIC_SUPABASE_URL`)
   - Kopiraj **anon public** key (to je tvoj `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Opciono: Kopiraj **service_role** key (za server-side operacije)

5. **Ubaci u `.env.local`:**
   ```env
   DATABASE_URL="postgresql://postgres:TVOJA-LOZINKA@db.TVOJ-PROJECT-ID.supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:TVOJA-LOZINKA@db.TVOJ-PROJECT-ID.supabase.co:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://TVOJ-PROJECT-ID.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="tvoj-anon-key-ovde"
   ```

### 🔐 Clerk Setup

1. **Idi na [clerk.com](https://clerk.com)** i uloguj se
2. **Kreiraj novu aplikaciju:**
   - Klikni "Create Application"
   - Ime: `TradeMaster`
   - Izaberi "Email" i "Google" kao metode za login (možeš i samo Email)
   - Klikni "Create"

3. **Uzmi API Keys:**
   - U Clerk Dashboard-u, idi na **API Keys** sekciju
   - Kopiraj **Publishable Key** (počinje sa `pk_test_...`)
   - Kopiraj **Secret Key** (počinje sa `sk_test_...`)

4. **Ubaci u `.env.local`:**
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_tvoj-kljuc-ovde
   CLERK_SECRET_KEY=sk_test_tvoj-secret-kljuc-ovde
   ```

## Korak 3: "Gurni" Bazu (Najbitniji trenutak!) 🗄️

Kada popuniš sve vrednosti u `.env.local`, otvori terminal u Cursoru (`Ctrl + ~`) i ukucaj:

```bash
npx prisma db push
```

**Šta ovo radi?**
- Povezuje se sa tvojom Supabase bazom
- Kreira sve tabele (Profile, Category, Product, Catalog, CatalogItem)
- Kreira sve relacije i indekse

**Ako vidiš:**
```
✅ Your database is now in sync with your Prisma schema
```

**To je to!** 🎉 Tvoje tabele su kreirane.

**Ako vidiš grešku:**
- Proveri da li si zamenio `[TVOJA-LOZINKA]` i `[TVOJ-PROJECT-ID]` u DATABASE_URL
- Proveri da li je lozinka URL-encoded (npr. `@` postaje `%40`)
- Proveri da li je Supabase projekat aktivan

## Korak 4: Pokreni Aplikaciju 🚀

U terminalu ukucaj:

```bash
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000) u browseru.

**Šta bi trebalo da vidiš:**
- Ako si na `/` - početna strana TradeMaster-a
- Ako si na `/sign-in` - Clerk login ekran
- Ako si na `/sign-up` - Clerk sign-up ekran

## Opciono: Seed Database

Ako želiš da dodaš neke početne kategorije u bazu:

```bash
npm run db:seed
```

Ovo će kreirati 3 osnovne kategorije: Electronics, Clothing, Home & Garden.

## Troubleshooting

### Greška: "Can't reach database server"
- Proveri da li je Supabase projekat aktivan
- Proveri DATABASE_URL format
- Proveri da li je lozinka ispravna

### Greška: "Invalid API key" (Clerk)
- Proveri da li si kopirao ceo ključ
- Proveri da li nema razmaka pre/posle ključa

### Greška: "Prisma Client not generated"
```bash
npm run db:generate
```

### Ne vidi se login ekran
- Proveri da li su Clerk ključevi ispravni
- Proveri browser console za greške
- Proveri da li je middleware.ts ispravno konfigurisan

## Sledeći Koraci

Kada sve radi:
1. ✅ Baza je postavljena
2. ✅ Authentication radi
3. 🔄 Sledeći korak: **Phase 2 - User Profile & Settings**

---

**Pitanja?** Proveri `project-spec.md` za detaljnu dokumentaciju.
