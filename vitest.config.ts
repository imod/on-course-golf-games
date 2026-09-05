import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['tests/helpers/env.ts'],
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Tests under tests/db/ share one real Supabase instance and call
    // resetDatabase(), which wipes tables mid-run of other files if they
    // execute concurrently. Run test files serially to keep them isolated.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
