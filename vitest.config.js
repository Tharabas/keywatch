import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // src/keys.js reads navigator.platform and attaches to document while being imported,
    // so the tests need a DOM from the very first import on.
    environment: 'happy-dom',
    include: ['test/**/*.spec.js'],
  },
})
