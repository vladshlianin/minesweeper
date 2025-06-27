/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

const config = defineConfig({
  server: {
    hmr: true,
  },
  test: {
    root: './src',
    environment: 'jsdom',
    coverage: {
      reportsDirectory: '../coverage',
      // enabled: true,
      reporter: ['text', 'html', 'lcov'],
    },
  },
});

export default config;
