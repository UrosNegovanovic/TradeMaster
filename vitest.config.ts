import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'src/lib/intake-request.test.ts',
      'src/lib/local-date.test.ts',
      'src/lib/invoice-totals.test.ts',
      'src/lib/invoice-validation.test.ts',
      'src/lib/invoice-status.test.ts',
      'src/lib/invoice-finance.test.ts',
      'src/lib/invoice-line.test.ts',
      'src/lib/draft-number.test.ts',
      'src/lib/persist-product-image.test.ts',
      'src/lib/public-catalog.test.ts',
      'src/app/api/invoices/route.test.ts',
      'src/app/api/invoices/[id]/route.test.ts',
      'src/app/api/public/catalogs/[id]/route.test.ts',
      'src/app/api/catalogs/[id]/route.test.ts',
      'src/test/require-test-database.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/*.db.test.ts',
      '**/*.integration.test.ts',
      '**/*.spec.ts',
      'e2e/**',
      'tests/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
