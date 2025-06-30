/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

const config = defineConfig({
  server: {
    hmr: true,
  },
  base: '/minesweeper',
  test: {
    root: './src',
    environment: 'jsdom',
    coverage: {
      reportsDirectory: '../coverage',
      reporter: ['text-summary', 'lcov', 'json-summary'],
    },
  },
});

export default config;
