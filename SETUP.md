# TradeMaster - Setup Instructions

## Initial Setup Complete ✅

The project has been initialized with:
- ✅ Next.js 14 with TypeScript and App Router
- ✅ Tailwind CSS configuration
- ✅ Shadcn UI components (Button, Input, Card, Dialog, Select, Checkbox)
- ✅ Prisma schema and configuration
- ✅ Clerk authentication setup
- ✅ TanStack Query providers
- ✅ Project folder structure
- ✅ TypeScript type definitions
- ✅ Validation schemas (Zod)

## Next Steps

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database - Get from Supabase project settings
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Clerk - Get from Clerk Dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase - Get from Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy the connection string from Project Settings > Database

2. **Run Prisma Migrations**
   ```bash
   npm run db:push
   ```
   This will create all tables in your Supabase database.

3. **Seed Database (Optional)**
   ```bash
   npm run db:seed
   ```
   This will create sample categories.

### 3. Clerk Setup

1. **Create Clerk Application**
   - Go to [clerk.com](https://clerk.com)
   - Create a new application
   - Copy the publishable key and secret key

2. **Configure Sign-in/Sign-up**
   - In Clerk Dashboard, configure your authentication methods
   - Set up redirect URLs (http://localhost:3000 for development)

### 4. Supabase Storage Setup

1. **Create Storage Buckets**
   - In Supabase Dashboard, go to Storage
   - Create two buckets:
     - `product-images` (public)
     - `merchant-logos` (public)

2. **Set up Storage Policies**
   - Allow authenticated users to upload files
   - Allow public read access

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Status

### ✅ Completed (Phase 1)
- Project initialization
- Configuration files
- Basic folder structure
- Authentication setup (Clerk)
- Database schema (Prisma)

### 🔄 Next Phase (Phase 2)
- User Profile & Settings
- Profile management API
- Settings page UI
- Logo upload functionality

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema to database
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database

# Code Quality
npm run lint             # Run ESLint
```

## Troubleshooting

### Prisma Client not found
Run `npm run db:generate` to regenerate the Prisma Client.

### Database connection errors
- Verify your `DATABASE_URL` is correct
- Check if your Supabase project is active
- Ensure the database password is URL-encoded

### Clerk authentication not working
- Verify your Clerk keys are correct
- Check that middleware is properly configured
- Ensure sign-in/sign-up routes are accessible

## Architecture Notes

- **App Router**: All routes use Next.js 14 App Router
- **Route Groups**: `(auth)` and `(dashboard)` are route groups for organization
- **API Routes**: Located in `src/app/api/`
- **Components**: Organized by feature (inventory, catalogs, etc.)
- **Types**: Centralized in `src/types/`
- **Validations**: Zod schemas in `src/lib/validations.ts`
