import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    target: 'node22',
  },
  test: {
    environment: 'jsdom'
  },
})
