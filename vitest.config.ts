import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'src/lib/invoice-totals.test.ts',
      'src/lib/invoice-validation.test.ts',
      'src/app/api/invoices/route.test.ts',
      'src/app/api/invoices/[id]/route.test.ts',
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
