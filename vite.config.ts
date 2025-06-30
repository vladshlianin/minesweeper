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
      reporter: ['text', 'html', 'lcov'],
    },
  },
});

export default config;
