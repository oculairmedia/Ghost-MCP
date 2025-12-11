import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.js', '__tests__/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['core/**/*.js', 'tools/**/*.js', 'transports/**/*.js'],
      exclude: ['__tests__/**', 'node_modules/**'],
    },
    testTimeout: 10000,
  },
});
