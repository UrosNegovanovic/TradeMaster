# TradeMaster

B2B web application for managing inventory and creating professional PDF catalogs for merchants/traders.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn UI
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Authentication:** Clerk
- **PDF Generation:** @react-pdf/renderer
- **State Management:** TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Clerk account and application

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TradeMaster
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
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

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # (Optional) Seed the database
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
TradeMaster/
├── prisma/              # Prisma schema and migrations
├── public/              # Static assets
├── src/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── lib/            # Utility functions and configurations
│   ├── hooks/          # Custom React hooks
│   └── types/          # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed the database

## Known pre-PRD limitations

- Lokalni razvoj i produkcija trenutno koriste isti Supabase projekat. Pre šireg timskog testiranja potrebno je uvesti odvojenu staging bazu.
- Profit koristi poslednju nabavnu cenu proizvoda kao snapshot pri izdavanju fakture. FIFO i trošak po pojedinačnoj nabavnoj turi ostaju za narednu fazu.

## License

Private - All rights reserved
