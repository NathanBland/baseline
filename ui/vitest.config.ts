/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { vitePlugin as remix } from '@remix-run/dev'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [remix(), tsconfigPaths()],
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
