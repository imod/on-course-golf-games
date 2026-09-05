import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/env.ts'],
    // Tests under tests/db/ share one real Supabase instance and call
    // resetDatabase(), which wipes tables mid-run of other files if they
    // execute concurrently. Run test files serially to keep them isolated.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
