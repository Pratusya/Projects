import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/components/__tests__/**/*.test.jsx', 'src/lib/__tests__/**/*.test.js'],
    setupFiles: 'src/components/__tests__/setup.js'
  }
});