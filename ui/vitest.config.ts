/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { vitePlugin as remix } from '@remix-run/dev'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [remix(), tsconfigPaths()] as any,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./app/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'build/',
        'public/',
        'app/test/',
        '**/*.d.ts'
      ]
    }
  }
})
