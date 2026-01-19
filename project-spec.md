# TradeMaster - Project Specification

## 1. Project Overview

**Application Name:** TradeMaster  
**Type:** B2B Web Application  
**Purpose:** Inventory management and professional PDF catalog generation for merchants/traders

### Core Features
- **Inventory Management:** CRUD operations for products (Name, SKU, Price, Image, Category)
- **Catalog Builder:** Select products, apply client-specific discounts (rabat), preview calculated prices
- **PDF Generation:** Generate branded PDF catalogs with merchant logo, contact info, and discounted product listings

### Key Workflows
1. Merchant adds/manages products in inventory
2. Merchant creates a catalog by selecting products
3. Merchant applies discount percentage for a specific client
4. System calculates and displays old price vs new price
5. System generates professional PDF catalog with branding

---

## 2. Tech Stack

### Core Framework
- **Next.js 14+** (App Router)
- **TypeScript** (strict mode)

### Styling & UI
- **Tailwind CSS** (utility-first CSS framework)
- **Shadcn UI** (component library built on Radix UI)

### Database & ORM
- **Supabase** (PostgreSQL database)
- **Prisma** (ORM for type-safe database queries)

### Authentication
- **Clerk** (recommended for Next.js 14 due to excellent App Router support, built-in components, and seamless integration)

### PDF Generation
- **@react-pdf/renderer** (React-based PDF generation library)

### State Management
- **TanStack Query (React Query)** (for server state management, caching, and synchronization)
- **React Context API** (for client-side UI state if needed)

### Additional Libraries
- **Zod** (schema validation)
- **React Hook Form** (form management)
- **date-fns** (date formatting)
- **next/image** (optimized image handling)

---

## 3. Project Structure

```
TradeMaster/
├── .env.local                 # Environment variables
├── .env.example              # Example environment variables
├── .gitignore
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
├── package.json
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seeding script
├── public/
│   ├── images/               # Static images
│   └── logos/                # Default logo placeholders
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home/Dashboard page
│   │   ├── (auth)/           # Auth routes group
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx
│   │   │   └── sign-up/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/      # Protected dashboard routes
│   │   │   ├── layout.tsx    # Dashboard layout with sidebar
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx  # Inventory list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # Create product
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Product detail/edit
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   ├── catalogs/
│   │   │   │   ├── page.tsx  # Catalog list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx  # Create catalog
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx  # Catalog builder/view
│   │   │   │       └── preview/
│   │   │   │           └── page.tsx  # PDF preview
│   │   │   ├── settings/
│   │   │   │   └── page.tsx  # Merchant settings (logo, contact info)
│   │   │   └── api/          # API routes
│   │   │       ├── products/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── catalogs/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts
│   │   │       │       └── generate-pdf/
│   │   │       │           └── route.ts
│   │   │       └── profile/
│   │   │           └── route.ts
│   │   ├── api/
│   │   │   └── webhooks/     # Webhook handlers (Clerk, etc.)
│   │   │       └── clerk/
│   │   │           └── route.ts
│   │   └── globals.css       # Global styles
│   ├── components/           # React components
│   │   ├── ui/               # Shadcn UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── inventory/
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── CategorySelect.tsx
│   │   ├── catalogs/
│   │   │   ├── CatalogBuilder.tsx
│   │   │   ├── ProductSelector.tsx
│   │   │   ├── DiscountInput.tsx
│   │   │   ├── PricePreview.tsx
│   │   │   └── CatalogPreview.tsx
│   │   ├── pdf/
│   │   │   ├── CatalogPDF.tsx
│   │   │   ├── PDFHeader.tsx
│   │   │   ├── PDFProductList.tsx
│   │   │   └── PDFFooter.tsx
│   │   └── settings/
│   │       ├── ProfileForm.tsx
│   │       └── LogoUpload.tsx
│   ├── lib/                  # Utility functions and configurations
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── clerk.ts          # Clerk configuration
│   │   ├── supabase.ts       # Supabase client (if needed for storage)
│   │   ├── utils.ts          # General utilities
│   │   └── validations.ts    # Zod schemas
│   ├── hooks/                # Custom React hooks
│   │   ├── useProducts.ts
│   │   ├── useCatalogs.ts
│   │   └── useProfile.ts
│   ├── types/                # TypeScript type definitions
│   │   ├── product.ts
│   │   ├── catalog.ts
│   │   ├── profile.ts
│   │   └── index.ts
│   └── styles/               # Additional styles if needed
│       └── components.css
└── README.md
```

---

## 4. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User profile linked to Clerk user ID
model Profile {
  id            String   @id @default(cuid())
  clerkUserId   String   @unique // Clerk user ID
  companyName   String?
  contactEmail  String?
  contactPhone  String?
  address       String?
  logoUrl       String?  // URL to uploaded logo (stored in Supabase Storage)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  products      Product[]
  catalogs      Catalog[]

  @@map("profiles")
}

// Product categories
model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  products    Product[]

  @@map("categories")
}

// Product inventory
model Product {
  id          String   @id @default(cuid())
  name        String
  sku         String
  price       Decimal  @db.Decimal(10, 2) // Base price
  imageUrl    String?  // URL to product image (stored in Supabase Storage)
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Foreign keys
  profileId   String
  categoryId  String?

  // Relations
  profile     Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  category    Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  catalogItems CatalogItem[]

  // Indexes
  @@unique([profileId, sku]) // SKU must be unique per merchant
  @@index([profileId])
  @@index([categoryId])
  @@map("products")
}

// Catalog (collection of products with client-specific discount)
model Catalog {
  id          String   @id @default(cuid())
  name        String   // Catalog name/identifier
  clientName  String?  // Client name (optional)
  discount    Decimal  @db.Decimal(5, 2) // Discount percentage (e.g., 15.50 for 15.5%)
  notes       String?  // Additional notes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Foreign keys
  profileId   String

  // Relations
  profile     Profile      @relation(fields: [profileId], references: [id], onDelete: Cascade)
  items       CatalogItem[]

  @@index([profileId])
  @@map("catalogs")
}

// Junction table: Products in a catalog with their discounted prices
model CatalogItem {
  id          String   @id @default(cuid())
  
  // Calculated prices (stored for historical reference)
  originalPrice Decimal @db.Decimal(10, 2) // Product price at time of catalog creation
  discountedPrice Decimal @db.Decimal(10, 2) // Calculated discounted price
  
  // Order/position in catalog
  sortOrder   Int      @default(0)

  createdAt   DateTime @default(now())

  // Foreign keys
  catalogId   String
  productId   String

  // Relations
  catalog     Catalog  @relation(fields: [catalogId], references: [id], onDelete: Cascade)
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  // Ensure a product appears only once per catalog
  @@unique([catalogId, productId])
  @@index([catalogId])
  @@index([productId])
  @@map("catalog_items")
}
```

### Database Relationships Summary
- **Profile** (1) → (N) **Product**: One merchant can have many products
- **Profile** (1) → (N) **Catalog**: One merchant can create many catalogs
- **Category** (1) → (N) **Product**: One category can have many products (optional)
- **Catalog** (1) → (N) **CatalogItem**: One catalog contains many items
- **Product** (1) → (N) **CatalogItem**: One product can appear in multiple catalogs
- **CatalogItem**: Junction table linking Catalog and Product with calculated prices

---

## 5. Implementation Plan

### Phase 1: Project Setup & Configuration
**Duration:** 1-2 days

#### Tasks:
1. **Initialize Next.js 14 project**
   - Create Next.js app with TypeScript
   - Configure App Router
   - Set up Tailwind CSS
   - Install and configure Shadcn UI

2. **Database Setup**
   - Create Supabase project
   - Configure Prisma with Supabase connection
   - Set up environment variables (.env.local)
   - Run initial Prisma migration

3. **Authentication Setup**
   - Install and configure Clerk
   - Set up Clerk middleware for route protection
   - Create sign-in/sign-up pages
   - Configure webhook for user sync (optional)

4. **Development Environment**
   - Configure TypeScript strict mode
   - Set up ESLint and Prettier
   - Create folder structure
   - Install core dependencies

5. **Storage Setup**
   - Configure Supabase Storage buckets for:
     - Product images
     - Merchant logos

---

### Phase 2: User Profile & Settings
**Duration:** 2-3 days

#### Tasks:
1. **Profile Management**
   - Create Profile model sync with Clerk user
   - Build settings page UI
   - Implement profile update API route
   - Add logo upload functionality (Supabase Storage)
   - Display merchant branding info

2. **Database Seeding**
   - Create seed script for development
   - Add sample categories
   - Test profile creation flow

---

### Phase 3: Inventory Management (CRUD)
**Duration:** 3-4 days

#### Tasks:
1. **Product Model & API**
   - Create Product API routes (GET, POST, PUT, DELETE)
   - Implement validation with Zod
   - Add image upload handling
   - Create Prisma queries with proper error handling

2. **Category Management**
   - Create Category API routes
   - Build category selector component
   - Add category creation/editing (optional admin feature)

3. **Product UI Components**
   - Build ProductList component with table/card view
   - Create ProductForm component (create/edit)
   - Implement ProductCard component
   - Add image upload/preview functionality
   - Implement product search/filter

4. **Inventory Pages**
   - Create inventory list page
   - Create product creation page
   - Create product edit page
   - Add delete confirmation dialogs

5. **Testing**
   - Test all CRUD operations
   - Validate image uploads
   - Test form validations

---

### Phase 4: Catalog Builder Core Logic
**Duration:** 3-4 days

#### Tasks:
1. **Catalog Model & API**
   - Create Catalog API routes
   - Create CatalogItem API routes
   - Implement discount calculation logic
   - Add validation for discount percentages (0-100%)

2. **Catalog Builder UI**
   - Build CatalogBuilder component
   - Create ProductSelector component (multi-select with search)
   - Build DiscountInput component
   - Create PricePreview component (showing old vs new price)
   - Implement catalog item reordering (sortOrder)

3. **Catalog Pages**
   - Create catalog list page
   - Create catalog builder page
   - Add catalog detail/view page
   - Implement catalog editing

4. **Price Calculation Logic**
   - Calculate discounted prices on catalog creation
   - Store original and discounted prices in CatalogItem
   - Display price comparison in UI
   - Handle edge cases (negative discounts, >100% discounts)

---

### Phase 5: PDF Generation
**Duration:** 3-4 days

#### Tasks:
1. **PDF Library Setup**
   - Install @react-pdf/renderer
   - Create PDF document structure
   - Design PDF layout (header, body, footer)

2. **PDF Components**
   - Create CatalogPDF component (main document)
   - Build PDFHeader component (logo, company info)
   - Create PDFProductList component (product table/list)
   - Build PDFFooter component (contact info, page numbers)

3. **PDF Styling**
   - Design professional catalog layout
   - Add merchant branding (logo, colors)
   - Style product listings with images
   - Format prices (old price strikethrough, new price highlighted)

4. **PDF Generation API**
   - Create API route for PDF generation
   - Implement server-side PDF rendering
   - Add PDF download functionality
   - Optionally add PDF preview in browser

5. **Testing**
   - Test PDF generation with various catalog sizes
   - Verify branding elements
   - Test with different discount scenarios
   - Validate PDF file size and quality

---

### Phase 6: Dashboard & Navigation
**Duration:** 2 days

#### Tasks:
1. **Dashboard Layout**
   - Create DashboardLayout component
   - Build Sidebar navigation
   - Create Header component with user menu
   - Add responsive mobile navigation

2. **Dashboard Home Page**
   - Display statistics (product count, catalog count)
   - Show recent products
   - Show recent catalogs
   - Add quick actions

3. **Route Protection**
   - Implement Clerk middleware
   - Protect all dashboard routes
   - Handle unauthorized access

---

### Phase 7: Polish & Optimization
**Duration:** 2-3 days

#### Tasks:
1. **State Management**
   - Implement TanStack Query for data fetching
   - Add optimistic updates
   - Implement caching strategies
   - Add loading and error states

2. **UI/UX Improvements**
   - Add loading skeletons
   - Implement error boundaries
   - Add toast notifications for actions
   - Improve mobile responsiveness
   - Add empty states

3. **Performance Optimization**
   - Optimize image loading (next/image)
   - Implement pagination for large lists
   - Add search and filtering
   - Optimize database queries (Prisma select)

4. **Error Handling**
   - Add comprehensive error handling
   - Create error pages (404, 500)
   - Add user-friendly error messages
   - Log errors appropriately

---

### Phase 8: Testing & Deployment
**Duration:** 2-3 days

#### Tasks:
1. **Testing**
   - Manual testing of all workflows
   - Test edge cases
   - Cross-browser testing
   - Mobile device testing

2. **Documentation**
   - Update README with setup instructions
   - Document environment variables
   - Add API documentation (if needed)

3. **Deployment Preparation**
   - Set up production environment variables
   - Configure production database
   - Set up production storage buckets
   - Configure Clerk for production

4. **Deployment**
   - Deploy to Vercel (recommended for Next.js)
   - Configure custom domain (if needed)
   - Set up monitoring and analytics

---

## 6. Architecture Decisions

### Authentication: Clerk vs Supabase Auth
**Decision: Clerk**

**Rationale:**
- Excellent Next.js 14 App Router support
- Built-in UI components (sign-in, sign-up)
- Seamless middleware integration
- Better developer experience
- Built-in user management dashboard
- Easy webhook integration for user sync

**Implementation:**
- Store Clerk user ID in Profile model
- Use Clerk middleware for route protection
- Sync user creation via webhook (optional)

### State Management: TanStack Query
**Decision: Use TanStack Query**

**Rationale:**
- Perfect for server state management
- Automatic caching and refetching
- Optimistic updates support
- Reduces boilerplate code
- Great TypeScript support

**Usage:**
- Product fetching and mutations
- Catalog fetching and mutations
- Profile data fetching
- Automatic cache invalidation

### PDF Generation: @react-pdf/renderer
**Decision: @react-pdf/renderer**

**Rationale:**
- React-based (fits well with Next.js)
- Component-based approach
- Good TypeScript support
- Active maintenance
- Flexible styling options

**Alternative Considered:**
- PDFKit (lower-level, more complex)
- jsPDF (less React-friendly)

### Image Storage: Supabase Storage
**Decision: Supabase Storage**

**Rationale:**
- Integrated with Supabase (same provider)
- Easy file upload API
- Built-in CDN
- Cost-effective
- Simple access control

---

## 7. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8. Key Features to Implement

### Inventory Management
- ✅ Create, read, update, delete products
- ✅ Product image upload
- ✅ Category assignment
- ✅ SKU uniqueness per merchant
- ✅ Search and filter products

### Catalog Builder
- ✅ Multi-select products
- ✅ Apply discount percentage
- ✅ Real-time price calculation
- ✅ Preview old vs new prices
- ✅ Reorder catalog items
- ✅ Save and edit catalogs

### PDF Generation
- ✅ Professional layout
- ✅ Merchant branding (logo, contact info)
- ✅ Product images in PDF
- ✅ Price comparison (strikethrough old price)
- ✅ Downloadable PDF file
- ✅ Optional browser preview

### User Experience
- ✅ Responsive design (mobile-friendly)
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Empty states
- ✅ Search and filtering

---

## 9. Future Enhancements (Post-MVP)

1. **Client Management**
   - Store client information
   - Client-specific catalog history
   - Multiple catalogs per client

2. **Advanced Catalog Features**
   - Catalog templates
   - Bulk discount application
   - Catalog versioning
   - Export to Excel/CSV

3. **Analytics**
   - Product performance metrics
   - Catalog usage statistics
   - Most popular products

4. **Multi-tenant Features**
   - Team collaboration
   - Role-based access control
   - Shared product libraries

5. **Email Integration**
   - Send catalogs via email
   - Email templates
   - Track email opens

---

## 10. Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow Next.js 14 App Router conventions
- Use functional components with hooks
- Implement proper error boundaries
- Use async/await for async operations

### Database
- Always use Prisma for database access
- Implement proper error handling
- Use transactions for multi-step operations
- Add indexes for frequently queried fields

### API Routes
- Use Next.js API routes (App Router)
- Implement proper HTTP status codes
- Add request validation (Zod)
- Return consistent error formats

### Components
- Use Shadcn UI components as base
- Create reusable, composable components
- Implement proper TypeScript types
- Add proper loading and error states

### Security
- Protect all API routes with Clerk authentication
- Validate all user inputs
- Sanitize file uploads
- Implement proper CORS policies

---

## 11. Estimated Timeline

**Total Development Time:** 18-25 days (approximately 4-5 weeks)

- Phase 1: Setup - 1-2 days
- Phase 2: Profile - 2-3 days
- Phase 3: Inventory - 3-4 days
- Phase 4: Catalog Builder - 3-4 days
- Phase 5: PDF Generation - 3-4 days
- Phase 6: Dashboard - 2 days
- Phase 7: Polish - 2-3 days
- Phase 8: Testing & Deployment - 2-3 days

**Note:** Timeline assumes a single developer working full-time. Adjust based on team size and experience level.

---

## 12. Success Criteria

### MVP Completion Checklist
- [ ] Users can sign up and manage their profile
- [ ] Users can create, edit, and delete products
- [ ] Users can upload product images
- [ ] Users can create catalogs with selected products
- [ ] Users can apply discounts and see calculated prices
- [ ] System generates professional PDF catalogs
- [ ] PDFs include merchant branding
- [ ] Application is responsive and works on mobile
- [ ] All core features are tested and working
- [ ] Application is deployed and accessible

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Author:** Senior Full Stack Software Architect
