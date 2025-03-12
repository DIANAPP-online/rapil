import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    target: 'node22',
  },
  test: {
    environment: 'jsdom',
    reporters: ['html'],
    coverage: {
      enabled: true,
      provider: 'v8',
      extension: ['.ts'],
      exclude: ['index.ts', 'vite.config.ts']
    }
  },
})
